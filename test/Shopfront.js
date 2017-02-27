const PromisifyWeb3 = require("../utils/promisifyWeb3.js");
PromisifyWeb3.promisify(web3);

require('../utils/getTransactionReceiptMined');

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
    var productCreatedEvent;
    var productBoughtEvent;

    before("New Shopfront instance", function(){
      return Shopfront.new({from:owner})
      .then(function(created){
         shopfront = created;
         return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
      })
      .then(receipt=>{
        
        assert.strictEqual(receipt.transactionHash, shopfront.transactionHash);
        
        //Promisify event.watch()
        productCreatedEvent = shopfront.OnProductCreated();
        productCreatedEvent.watchPromise = function () {
            return new Promise(function (resolve, reject) {
                productCreatedEvent.watch(function(e, result) {
                    if (e != null) {
                        reject(e);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        productBoughtEvent = shopfront.OnProductBought();
        productBoughtEvent.watchPromise = function () {
            return new Promise(function (resolve, reject) {
                productBoughtEvent.watch(function(e, result) {
                    if (e != null) {
                        reject(e);
                    } else {
                        resolve(result);
                    }
                });
            });
        };
      });
    });

    it("should add products, which consist of an id, a price and a stock as an administrator", function() {

      return shopfront.newProduct.call(product0.price, product0.stock, {from:owner})
      .then(function(success){
          assert.isTrue(success);
          return shopfront.newProduct(product0.price, product0.stock, {from:owner});
      })
      .then(function(txHash){
          return web3.eth.getTransactionReceiptMined(txHash);
      })
      .then(function(receipt){
        return productCreatedEvent.watchPromise();
      })
      .then(function(result){
        pID = parseInt(result.args.productID);
        assert.strictEqual(pID, 0);
        return shopfront.products(pID);
      })
      .then(function(product){
        assert.strictEqual(product[0].toString(), product0.price.toString());
        assert.strictEqual(product[1].toString(), product0.stock.toString());
      })
    });
    
    it("should add products, which consist of an id, a price and a stock as an administrator", function() {

      return shopfront.newProduct.call(product1.price, product1.stock, {from:owner})
      .then(function(success){
          assert.isTrue(success);
          return shopfront.newProduct(product1.price, product1.stock, {from:owner});
      })
      .then(function(txHash){
          return web3.eth.getTransactionReceiptMined(txHash);
      })
      .then(function(receipt){
        return productCreatedEvent.watchPromise()
      })
      .then(function(result){
        pID = parseInt(result.args.productID);
        assert.strictEqual(pID, 1);
        return shopfront.products(pID);
      })
      .then(function(product){
        assert.strictEqual(product[0].toString(), product1.price.toString());
        assert.strictEqual(product[1].toString(), product1.stock.toString());
      })
    });
    
    it("should let a regular user buy 1 of the products", function(){
      
      return shopfront.buy.call(0, {from:accounts[1], value:product0.price})
      .then(function(success){
          assert.isTrue(success);
          return shopfront.buy(0, {from:accounts[1], value:product0.price});
      })
      .then(function(txHash){
          return web3.eth.getTransactionReceiptMined(txHash);
      })
      .then(function(receipt){
        return productBoughtEvent.watchPromise();
      })
      .then(function(result){
        assert.strictEqual(result.args.buyer.toString(), accounts[1].toString());
        assert.strictEqual(result.args.productID.toString(), '0');
        assert.strictEqual(result.args.price.toString(), product0.price.toString());
      });
    });
    
    it("should let owner make payments or withdraw value from the contract.", function(){
      var ownerBalanceBefore;
      var withdrawAmount;
      var ownerBalanceAfter;

      return web3.eth.getBalancePromise(owner)
      .then(result=>{
        ownerBalanceBefore = result;
        withdrawAmount = 100000000000000000;
        return shopfront.withdraw.call(withdrawAmount, {owner});
      })
      .then(success=>{
        assert.isTrue(success);
        return shopfront.withdraw(withdrawAmount, {owner});
      })
      .then(txHash=>{
        return web3.eth.getTransactionReceiptMined(txHash);
      })
      .then(receipt=>{
        return web3.eth.getBalancePromise(owner);
      })
      .then(result=>{
        ownerBalanceAfter = result;
        assert.strictEqual(ownerBalanceBefore.plus(100000000000000000).toString(), ownerBalanceAfter.toString());
      });
    });
    
  }); //describe Shopfront Basic
}); //contract
