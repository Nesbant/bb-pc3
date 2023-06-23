import { BigNumber, Contract, providers, ethers, utils } from "ethers";

var usdcTknAbi = require("../artifacts/contracts/USDCoin.sol/USDCoin.json").abi;
var miPrimerTknAbi = require("../artifacts/contracts/MiPrimerToken.sol/MiPrimerToken.json").abi;
var publicSaleAbi= require("../artifacts/contracts/PublicSale.sol/PublicSale.json").abi;
var nftTknAbi =  require("../artifacts/contracts/NFT.sol/MiPrimerNft.json").abi

window.ethers = ethers;

var provider, signer, account;
var usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

// REQUIRED
// Conectar con metamask
function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  var usdcAddress = "0x44B50879D81d6a969b52Cd85ef46C10FA0C95F65";
  var miPrTknAdd = "0x8fB76773270d1E9B5d0e0987690f22215300BEa6";
  var pubSContractAdd = "0x0B817bC374775Ff52f4AcEF67A0c61BeD358A033";

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi, provider);
  miPrTokenContract = new Contract(miPrTknAdd, miPrimerTknAbi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi, provider);
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
function initSCsMumbai() {
  var rpcProvider= new providers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com');
  var nftAddress = "0xF4147eEe4228A38F9d2904437182c9B790bc1c2c";
  nftTknContract = new Contract(nftAddress, nftTknAbi, rpcProvider);
}

function setUpListeners() {
  // Connect to Metamask   
    var bttn = document.getElementById("connect");
    bttn.addEventListener("click", async function () {
      if (window.ethereum) {
        [account] = await ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log("Billetera Metamask", account);
  
        provider = new providers.Web3Provider(window.ethereum);
        signer = provider.getSigner(account);
        window.signer = signer;
      }
    });
    var btnUsdcRefresh = document.getElementById("usdcUpdate");
    var usdcBalance = document.getElementById("usdcBalance");
    btnUsdcRefresh.addEventListener("click", async function () {
      const amount = await usdcTkContract.balanceOf(account);
      usdcBalance.innerText=amount;
    });
    var btnMiPrimerTknUpdate = document.getElementById("miPrimerTknUpdate");
    var miPrimerTknBalance = document.getElementById("miPrimerTknBalance");
    btnMiPrimerTknUpdate.addEventListener("click", async function () {
      const amount = await miPrTokenContract.balanceOf(account);
      miPrimerTknBalance.innerText=amount;
    });
    var approveButton = document.getElementById("approveButton");
    var approveError = document.getElementById("approveError");
    approveButton.addEventListener("click", async function () {
      approveError.innerText="";
      var amount = document.getElementById("approveInput").value;
      try {
        var tx = await miPrTokenContract.connect(signer).approve(pubSContract.address, amount);
        return await tx.wait();

      }catch (e) {
        approveError.innerText=e.reason;
      }
    });
    var purchaseButton = document.getElementById("purchaseButton");
    var purchaseError = document.getElementById("purchaseError");
    purchaseButton.addEventListener("click", async function () {
      purchaseError.innerText="";
      var nftId = document.getElementById("purchaseInput").value;
      try {
        var tx = await pubSContract.connect(signer).purchaseNftById(nftId);
        return await tx.wait();

      }catch (e) {
        purchaseError.innerText=e.reason;
      }
    });
    var purchaseEthButton = document.getElementById("purchaseEthButton");
    var purchaseEthError = document.getElementById("purchaseEthError");
    purchaseEthButton.addEventListener("click", async function () {
      purchaseEthError.innerText="";
      try {
        var tx = await pubSContract.connect(signer).depositEthForARandomNft({
          value: utils.parseUnits("0.01","ether")
          
        });
        return await tx.wait();

      }catch (e) {
        purchaseEthError.innerText=e.reason;
      }
    });
    var sendEtherButton = document.getElementById("sendEtherButton");
    var sendEtherError = document.getElementById("sendEtherError");
    sendEtherButton.addEventListener("click", async function () {
      sendEtherError.innerText="";
      try {
        var tx = await pubSContract.connect(signer).sendTransaction({
          value: utils.parseUnits("0.01","ether")
        });
        return await tx.wait();
      }catch (e) {
        sendEtherError.innerText=e.reason;
      }
    });
  
  
  
  }

function setUpEventsContracts() {
  nftTknContract.on("Transfer", (from, to, tokenId) => {
    console.log("from", from);
    console.log("to", to);
    tokenId++;
    console.log("tokenId", tokenId);
    
    var li = document.createElement("li");
    li.classList.add('collection-item');
    // li.className = "collection-item";
    var p = document.createElement("p");
    var contenido = "Transfer from " + from + " to " + to + " tokenId " + tokenId;
    p.appendChild(document.createTextNode(contenido));
    document.querySelector("#nftList").appendChild(li).appendChild(p);
  });

}

  async function setUp() {
    initSCsGoerli();
    initSCsMumbai();
    await setUpListeners();
    await setUpEventsContracts();
  }
  
  setUp()
    .then()
    .catch((e) => console.log(e));