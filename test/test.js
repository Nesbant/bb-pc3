const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth, printAddress } = require("../utils");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

// 17 de Junio del 2023 GMT
var startDate = 1686960000;

var makeBN = (num) => ethers.BigNumber.from(String(num));

describe("MI PRIMER TOKEN TESTING", function () {
  var nftContract, publicSale, miPrimerToken, usdc;
  var owner, gnosis, alice, bob, carl, deysi;
  var name = "Mi Primer NFT";
  var symbol = "MPRNFT";

  before(async () => {
    [owner, gnosis, alice, bob, carl, deysi] = await ethers.getSigners();
  });

  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNftSC() {
    nftContract = await deploySC("MiPrimerNft", [name, symbol]);
    var implementation = await printAddress(name, nftContract.address);
    // set up
    await ex(nftContract, "grantRole", [MINTER_ROLE, gnosis.address], "GR");
  }

  async function deployPublicSaleSC() {
    miPrimerToken = await deploySC("MiPrimerNft", [name, symbol]);
    await printAddress(name, miPrimerToken.address);
    publicSale = await deploySC("PublicSale");
    await printAddress(name, publicSale.address);
    await ex(publicSale, "setGnosisSafeWallet", [gnosis.address], "GR");
    await ex(publicSale, "setTokenAddress", [miPrimerToken.address], "GR");
  }

  describe("Mi Primer Nft Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNftSC();
    });

    it("Verifica nombre colección", async () => {
      const contractName = await nftContract.name();
      expect(contractName).to.be.equals(name);
    });

    it("Verifica símbolo de colección", async () => {
      const contractSymbol = await nftContract.symbol();
      expect(contractSymbol).to.be.equals(symbol);
    });

    it("No permite acuñar sin privilegio", async () => {
      await expect( nftContract.connect(bob).safeMint(bob.address, 1)
    ).to.be.reverted;
    });

    it("No permite acuñar doble id de Nft", async () => {
      await nftContract.safeMint(bob.address, 1);
      await expect(nftContract.safeMint(bob.address, 1)).revertedWith("Public Sale: id was minted before");
    });

    it("Verifica rango de Nft: [1, 30]", async () => {
      // Mensaje error: "NFT: Token id out of range"
      await expect(
        nftContract.safeMint(bob.address, 31)).revertedWith("Public Sale: id must be between 1 and 30");
      await expect(
        nftContract.connect(owner).safeMint(alice.address,0)
      ).to.be.revertedWith("NFT: Token id out of range");
    });

    it("Se pueden acuñar todos (30) los Nfts", async () => {
      for (let i = 1; i <= 30; i++) {
        await nftContract.safeMint(bob.address, i);
      }
    });
  });

  describe("Public Sale Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployPublicSaleSC();
    });

    it("No se puede comprar otra vez el mismo ID", async () => {
      await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
      await publicSale.purchaseNftById(1);
      await expect(publicSale.purchaseNftById(1)).revertedWith("Public Sale: id not available")
    });

    it("IDs aceptables: [1, 30]", async () => {
      await expect(publicSale.purchaseNftById(32)).revertedWith("NFT: Token id out of range");
    });

    it("Usuario no dio permiso de MiPrimerToken a Public Sale", async () => {
      await expect(publicSale.purchaseNftById(1)).revertedWith('Public Sale: Not enough allowance');

    });

    it("Usuario no tiene suficientes MiPrimerToken para comprar", async () => {
      await miPrimerToken.transfer(bob.address, ethers.utils.parseUnits("5", 18));
      await miPrimerToken.connect(bob).approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
      await expect(publicSale.connect(bob).purchaseNftById(1)).revertedWith('Public Sale: Not enough token balance');

    });

    describe("Compra grupo 1 de NFT: 1 - 10", () => {
      it("Emite evento luego de comprar", async () => {
        // modelo para validar si evento se disparo con correctos argumentos
        var id = 1;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        var tx = await publicSale.purchaseNftById(1);
        await expect(tx)
              .to.emit(publicSale, "DeliverNft")
              .withArgs(owner.address, id);
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        await expect( () =>publicSale.purchaseNftById(1)).to.changeTokenBalance(miPrimerToken,owner, ethers.utils.parseUnits("-500", 18));
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        await expect( () =>publicSale.purchaseNftById(1)).to.changeTokenBalance(miPrimerToken,gnosis, ethers.utils.parseUnits("50", 18));
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var amount = 500;
        var net = amount * 0.9;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits(amount.toString(), 18));
        await expect( () =>publicSale.purchaseNftById(1)).to.changeTokenBalance(miPrimerToken,publicSale, ethers.utils.parseUnits(net.toString(), 18));
      });
    });

    describe("Compra grupo 2 de NFT: 11 - 20", () => {
      it("Emite evento luego de comprar", async () => {
        var id = 11;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        var tx = await publicSale.purchaseNftById(id);
        await expect(tx)
            .to.emit(publicSale, "DeliverNft")
            .withArgs(owner.address, id);
      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        var id = 11;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        await expect( () =>publicSale.purchaseNftById(id)).to.changeTokenBalance(miPrimerToken,owner, ethers.utils.parseUnits((id*-1000).toString(), 18));
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        var id=11;
        var price=id*1000;
        var fee = price*0.1;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        await expect( () =>publicSale.purchaseNftById(id)).to.changeTokenBalance(miPrimerToken,gnosis, ethers.utils.parseUnits(fee.toString(), 18));

      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var id =11;
        var amount = id*1000;
        var net = amount * 0.9;
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits(amount.toString(), 18));
        await expect( () =>publicSale.purchaseNftById(id)).to.changeTokenBalance(miPrimerToken,publicSale, ethers.utils.parseUnits(net.toString(), 18));
      });
    });

    describe("Compra grupo 3 de NFT: 21 - 30", () => {
      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        var id = 21;
        var balanceBefore = await miPrimerToken.balanceOf(owner.address);
        await miPrimerToken.approve(publicSale.address,ethers.utils.parseUnits("50000", 18));
        await publicSale.purchaseNftById(id);
        var balanceAfter = await miPrimerToken.balanceOf(owner.address);
        var price = balanceBefore.sub(balanceAfter);
        expect(price).to.be.at.most(ethers.utils.parseUnits("50000", 18));
        expect(price).to.be.at.least(ethers.utils.parseUnits("10000", 18));
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        var id = 21;
        var price = pEth("50000");
        var fee = price.div(10);
        await miPrimerToken.approve(publicSale.address, price);
        await expect(publicSale.purchaseNftById(id)).to.changeTokenBalance(miPrimerToken,gnosis, fee);

      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        var id = 21;
        var net = pEth("45000");
        await miPrimerToken.approve(publicSale.address, pEth("50000"));
        await expect(publicSale.purchaseNftById(id)).to.changeTokenBalance(miPrimerToken,publicSale, net);
      });
    });

    describe("Depositando Ether para Random NFT", () => {
      it("Método emite evento (30 veces) ", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("5000000"));
        for (let i = 1; i < 31; i++) {
          var tx = await publicSale.depositEthForARandomNft({value: pEth("0.01")});
          await expect(tx)
              .to.emit(publicSale, "DeliverNft");

        }
      });

      it("Método falla la vez 31", async () => {
        await miPrimerToken.approve(publicSale.address, pEth("5000000"));
        for (let i = 1; i < 31; i++) {
          var tx = await publicSale.depositEthForARandomNft({value: pEth("0.01")});
          await expect(tx)
              .to.emit(publicSale, "DeliverNft");

        }
        await expect(publicSale.depositEthForARandomNft({value: pEth("0.01")})).to.revertedWith('No NFTs available');

      });

      it("Envío de Ether y emite Evento (30 veces)", async () => {
        for (let i = 0; i < 30; i++) {
          await expect(owner.sendTransaction({
            to : publicSale.address,
            value: pEth("0.01")
          })).to.emit(publicSale, "DeliverNft");

        }

      });

      it("Envío de Ether falla la vez 31", async () => {
        for (let i = 0; i < 30; i++) {
          await expect(owner.sendTransaction({
            to : publicSale.address,
            value: pEth("0.01")
          })).to.emit(publicSale, "DeliverNft");

        }
        await expect(owner.sendTransaction({
          to : publicSale.address,
          value: pEth("0.01")
        })).to.revertedWith('No NFTs available');

      });

      it("Da vuelto cuando y gnosis recibe Ether", async () => {

        await expect(
           await owner.sendTransaction({
             to: publicSale.address,
             value: pEth("0.02"),
           })
         ).to.changeEtherBalances(
           [owner.address, gnosis.address],
           [pEth("-0.01"), pEth("0.01")]
         );
      });
    });
  });
});