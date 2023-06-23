require("dotenv").config();

const {
  getRole,
  verify,
  ex,
  printAddress,
  deploySC,
  deploySCNoUp,
} = require("../utils");

var MINTER_ROLE = getRole("MINTER_ROLE");
var BURNER_ROLE = getRole("BURNER_ROLE");

async function deployMumbai() {
  var relayerAddress = "0x8EBb209a75a8083335E4e11Af7eFb637E39891A5";
  var name = "Mi Primer NFT";
  var symbol = "MPRNFT";
  var nftContract = await deploySC("MiPrimerNft", [name, symbol]);
  var implementation = await printAddress("NFT", nftContract.address);

  // set up
  await ex(nftContract, "grantRole", [MINTER_ROLE, relayerAddress], "GR");

  await verify(implementation, "MiPrimerNft", []);
}

async function deployGoerli() {
  // gnosis safe
  // Crear un gnosis safe en https://gnosis-safe.io/app/
  // Extraer el address del gnosis safe y pasarlo al contrato con un setter
  var gnosis = { address: "0x010F4D09d16984d97167da62d4A7D73957C1ef6b" };
  var usdContract = await deploySCNoUp("USDCoin", [])
  await verify(usdContract.address, 'USDCoin',[]);
  var name = 'MiPrimerToken';
  var miPrimerToken = await deploySC(name,[]);
  var implementationMiPrimerToken = await printAddress("MPKT", miPrimerToken.address);
  await verify(implementationMiPrimerToken, name, []);

  var publicSale = await deploySC("PublicSale");
  var implementation = await printAddress("PublicSale", publicSale.address);
  await verify(implementation, "PublicSale", []);
  await ex(publicSale, "setGnosisSafeWallet", [gnosis.address], "GR");
  await ex(publicSale, "setTokenAddress", [miPrimerToken.address], "GR");
}

// deployMumbai()
deployGoerli()
  //
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })