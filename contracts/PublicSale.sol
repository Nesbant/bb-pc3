// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PublicSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mi Primer Token
    // Crear su setter
    IERC20Upgradeable miPrimerToken;


    function setMiPrimerToken(address tokenAddress) public {
        miPrimerToken = IERC20Upgradeable(tokenAddress);
    }

    // 17 de Junio del 2023 GMT
    uint256 constant startDate = 1686960000;

    // Maximo price NFT
    uint256 constant MIN_PRICE_NFT = 10000 * 10 ** 18;
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;
    uint256 constant INCREMENT_PRICE_NFT = 1000 * 10 ** 18;
    uint256 constant CANT_NFT = 30;
    uint256 cantNFTVendidos; 
    // Gnosis Safe
    // Crear su setter
    address gnosisSafeWallet;

    mapping(uint256 => bool) isSold;



  function setGnosisSafeWallet(address walletAddress) public {
        gnosisSafeWallet = walletAddress;
    }
    event DeliverNft(address winnerAccount, uint256 nftId);
    event Received(uint256 etherAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function purchaseNftById(uint256 _id) external {
        // Realizar 3 validaciones:
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        //         * Mensaje de error: "Public Sale: id not available"
        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough allowance"
        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough token balance"
        // 4 - el _id se encuentre entre 1 y 30
        //         * Mensaje de error: "NFT: Token id out of range"



        // Obtener el precio segun el id
        uint256 priceNft = _getPriceById(_id);
        require(!isSold[_id], "Public Sale: id not available");
        require(miPrimerToken.allowance(msg.sender, address(this)) >= priceNft, "Public Sale: Not enough allowance");
        require(miPrimerToken.balanceOf(msg.sender) >= priceNft, "Public Sale: Not enough token balance");
        require(_id >= 1 && _id <= 30, "NFT: Token id out of range");


        // // Purchase fees
        // // 10% para Gnosis Safe (fee)
        uint256 fee = (priceNft * 10) / 100;
        // // 90% se quedan en este contrato (net)
        uint256 net = priceNft - fee;
        // // from: msg.sender - to: gnosisSafeWallet - amount: fee
         // // from: msg.sender - to: address(this) - amount: net
        miPrimerToken.transferFrom(msg.sender, address(this), net);

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, _id);
    }

    function depositEthForARandomNft() public payable {
        // Realizar 2 validaciones
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        // 2 - que haya NFTs disponibles para hacer el random
        require(msg.value >= 0.01 ether,"Insufficient amount of ether");
        // Escgoer una id random de la lista de ids disponibles
        uint256 nftId = _getRandomNftId();
        
        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        (bool success, ) = gnosisSafeWallet.call{value: 0.01 ether, gas: 500000}("");
        require(success, "Failed Operation");

        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        if (msg.value > 0.01 ether) {
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
            uint256 returnEthers = msg.value - 0.01 ether;
            payable(msg.sender).transfer(returnEthers);
        }


        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }


    // PENDING
    // Crear el metodo receive
        receive() external payable {
            emit Received(msg.value);
            depositEthForARandomNft();
        }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    // Devuelve un id random de NFT de una lista de ids disponibles
    function _getRandomNftId() internal view returns (uint256) {
        return (uint256( keccak256(abi.encodePacked(block.timestamp, msg.sender)) ) % 30) + 1;
    }

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id) internal view returns (uint256) {
        if (_id > 0 && _id < 11) {
            return 500*10**18;
        } else if (_id > 10 && _id < 21) {
            return _id*1000*10**18;
        } else {
            uint256 hoursex = (block.timestamp - startDate)/(60*60);
            uint256 priceGroupThree = MIN_PRICE_NFT + (hoursex*INCREMENT_PRICE_NFT);
            if(priceGroupThree > MAX_PRICE_NFT){
                return MAX_PRICE_NFT;
            }
            return priceGroupThree;
        }
    
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
