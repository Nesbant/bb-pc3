// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MiPrimerToken is Initializable, ERC20Upgradeable,ERC20BurnableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("MiPrimerToken", "MPRTKN");
        __ERC20Burnable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}