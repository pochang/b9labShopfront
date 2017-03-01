const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Shopfront', function(accounts) {
  
  describe("Shopfront Basic", function(){

    var shopfront;
    var owner = accounts[0];
    var product0 = {
        price: 900000000000000000,
        stock: 10
    };
    var product1 = {
        price: 700000000000000000,
        stock: 8
    };
    

    describe('add products', function() {

        before("should create a shopfront", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          });
        });

        var products = [
          {price: 900000000000000000, stock: 10},
          {price: 800000000000000000, stock: 8},
          {price: 700000000000000000, stock: 762},
        ];

        return products.forEach(function(product){

            it("should add products("+products.indexOf(product)+"), which consist of an id, a price and a stock as an owner", function() {

                return shopfront.newProduct.call(product.price, product.stock, {from:owner})
                .then(function(success){
                    assert.isTrue(success, "should be possible for owner to add a product");
                    return shopfront.newProduct(product.price, product.stock, {from:owner});
                })
                .then(function(txHash){
                    return web3.eth.getTransactionReceiptMined(txHash);
                })
                .then(function(receipt){
                  return Extensions.getEventsPromise(shopfront.OnProductCreated({},{fromBlock: receipt.blockNumber}));
                })
                .then(function(events){
                  pID = events[0].args.productID;
                  assert.strictEqual(pID.toString(), products.indexOf(product).toString(), "pID should be "+products.indexOf(product));
                  return shopfront.products(pID);
                })
                .then(function(result){
                  //console.log("Product"+products.indexOf(product)+" Price:"+result[0]+", Stock:"+result[1]);
                  assert.strictEqual(result[0].toString(), product.price.toString());
                  assert.strictEqual(result[1].toString(), product.stock.toString());
                });
            });
        });
    });
    
    describe('buy products', function(){

        var product = {price: 900000000000000000, stock: 10};

        beforeEach("should create a shopfront with products", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          })
          .then(function(receipt){
              return shopfront.newProduct(product.price, product.stock, {from:owner});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          });
        });

        it("should let a regular user buy 1 of the products", function(){
          return shopfront.buy.call(0, {from:accounts[1], value:product.price})
          .then(function(success){
              assert.isTrue(success);
              return shopfront.buy(0, {from:accounts[1], value:product.price});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(function(receipt){
              return Extensions.getEventsPromise(shopfront.OnProductBought({},{fromBlock: receipt.blockNumber}));
          })
          .then(function(events){
            //console.log("Buyer:"+events[0].args.buyer+", Product:"+events[0].args.productID+", Price:"+events[0].args.price);
            assert.strictEqual(events[0].args.buyer.toString(), accounts[1].toString());
            assert.strictEqual(events[0].args.productID.toString(), '0');
            assert.strictEqual(events[0].args.price.toString(), product.price.toString());
          });
        });

    });

    describe('owner can make payments from the contract', function(){

        var product = {price: 900000000000000000, stock: 10};
        var contractBalanceBefore, payeeBalanceBefore;

        beforeEach("should create a shopfront with balance", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          })
          .then(function(receipt){
              return shopfront.newProduct(product.price, product.stock, {from:owner});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(function(receipt){
            return shopfront.buy(0, {from:accounts[1], value:product.price});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(function(receipt){
            return web3.eth.getBalancePromise(shopfront.address);
          })
          .then(result=>{
            contractBalanceBefore = result;
            return web3.eth.getBalancePromise(accounts[2]);
          })
          .then(result=>{
            payeeBalanceBefore = result;
          });
        });

        it("should let owner pay some value from the contract.", function(){
          
          var contractBalanceAfter, payeeBalanceAfter;

          return shopfront.pay.call(accounts[2], 100000000000000000, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.pay(accounts[2], 100000000000000000, {owner});
          })
          .then(txHash=>{
            return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(accounts[2]);
          })
          .then(result=>{
            payeeBalanceAfter = result;
            assert.strictEqual(contractBalanceBefore.minus(100000000000000000).toString(), contractBalanceAfter.toString(), "contract balance should loss 0.1 ether");
            assert.strictEqual(payeeBalanceBefore.plus(100000000000000000).toString(), payeeBalanceAfter.toString(), "payee's balance should gain 0.1 ether");
          });
        });

        it("should let owner pay all value from the contract.", function(){
          
          var contractBalanceAfter, payeeBalanceAfter;
          
          return shopfront.pay.call(accounts[2], contractBalanceBefore, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.pay(accounts[2], contractBalanceBefore, {owner});
          })
          .then(txHash=>{
            return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(accounts[2]);
          })
          .then(result=>{
            payeeBalanceAfter = result;
            assert.strictEqual(contractBalanceBefore.minus(contractBalanceBefore).toString(), contractBalanceAfter.toString(), "contract balance should be 0");
            assert.strictEqual(payeeBalanceBefore.plus(contractBalanceBefore).toString(), payeeBalanceAfter.toString(), "payee's balance should gain 0.9 ether");
          });
        });        

    });

    
    describe('owner can withdraw value from the contract', function(){

        var product = {price: 900000000000000000, stock: 10};
        var contractBalanceBefore, ownerBalanceBefore;

        beforeEach("should create a shopfront with balance", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          })
          .then(function(receipt){
              return shopfront.newProduct(product.price, product.stock, {from:owner});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(function(receipt){
            return shopfront.buy(0, {from:accounts[1], value:product.price});
          })
          .then(function(txHash){
              return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(function(receipt){
            return web3.eth.getBalancePromise(shopfront.address);
          })
          .then(result=>{
            contractBalanceBefore = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceBefore = result;
          });
        });

        it("should let owner withdraw 0 from the contract.", function(){
          var contractBalanceAfter, ownerBalanceAfter;
          
          return shopfront.withdraw.call(0, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.withdraw(0, {owner});
          })
          .then(txHash=>{
            return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceAfter = result;
            assert.strictEqual(contractBalanceBefore.toString(), contractBalanceAfter.toString(), "contract balance should be the same");
            assert.strictEqual(ownerBalanceBefore.toString(), ownerBalanceAfter.toString(), "owner's balance should be the same");
          });
        });


        it("should let owner withdraw some value from the contract.", function(){
          var contractBalanceAfter, ownerBalanceAfter;
          
          return shopfront.withdraw.call(100000000000000000, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.withdraw(100000000000000000, {owner});
          })
          .then(txHash=>{
            return web3.eth.getTransactionReceiptMined(txHash);
          })
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceAfter = result;
            assert.strictEqual(contractBalanceBefore.minus(100000000000000000).toString(), contractBalanceAfter.toString(), "contract balance should loss 0.1 ether");
            assert.strictEqual(ownerBalanceBefore.plus(100000000000000000).toString(), ownerBalanceAfter.toString(), "owner's balance should gain 0.1 ether");
          });
        });

    });


  });


});
