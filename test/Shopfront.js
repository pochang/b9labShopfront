const PromisifyWeb3 = require("../utils/promisifyWeb3.js");
PromisifyWeb3.promisify(web3);

web3.eth.getTransactionReceiptMined = function (txnHash, interval) {
    var transactionReceiptAsync;
    interval = interval ? interval : 500;
    transactionReceiptAsync = function(txnHash, resolve, reject) {
        try {
            var receipt = web3.eth.getTransactionReceipt(txnHash);
            if (receipt == null) {
                setTimeout(function () {
                    transactionReceiptAsync(txnHash, resolve, reject);
                }, interval);
            } else {
                resolve(receipt);
            }
        } catch(e) {
            reject(e);
        }
    };

    if (Array.isArray(txnHash)) {
        var promises = [];
        txnHash.forEach(function (oneTxHash) {
            promises.push(web3.eth.getTransactionReceiptMined(oneTxHash, interval));
        });
        return Promise.all(promises);
    } else {
        return new Promise(function (resolve, reject) {
                transactionReceiptAsync(txnHash, resolve, reject);
            });
    }
};

contract('Shopfront', function(accounts) {
  describe("Shopfront Basic", function(){
    var shopfront;
    var sfTxHash;
    var sfAddress;
    var owner = accounts[0];
    var price0 = 660000;
    var stock0 = 990000;
    var price1 = 770000;
    var stock1 = 880000;
    before("New Shopfront instance", function(){
      Shopfront.new()
      .then(function(created){
         shopfront = created;
         sfTxHash = shopfront.transactionHash;
         sfAddress = shopfront.address;
      })
    });
    it("should add products, which consist of an id, a price and a stock as an administrator", function() {
      web3.eth.getTransactionReceiptMined(sfTxHash)
      .then(function(receipt){
        return shopfront.newProduct(price0, stock0, {from:owner});
      })
      .then(function(pID){
        assert.strictEqual(pID, 0);
        assert.strictEqual(shopfront.products(pID).price, price0);
        assert.strictEqual(shopfront.products(pID).stock, stock0);
        return shopfront.newProduct(price1, stock1);
      })
      .then(function(pID){
        assert.strictEqual(pID, 1);
        assert.strictEqual(shopfront.products(pID).price, price1);
        assert.strictEqual(shopfront.products(pID).stock, stock1);
      });
    });
    it("should let a regular user buy 1 of the products", function(){
      web3.eth.getTransactionReceiptMined(sfTxHash)
      .then(function(receipt){
        return shopfront.buy(0, {from:accounts[1], value:shopfront.products(0).price});
      })
      .then(function(txID){
        assert.strictEqual(txID, 0);
        assert.strictEqual(shopfront.productTxs[txID].buyer, accounts[1]);
        assert.strictEqual(shopfront.productTxs[txID].productID, 0);
        return shopfront.buy(1, {from:accounts[2], value:shopfront.products(1).price});
      })
      .then(function(txID){
        assert.strictEqual(txID, 1);
        assert.strictEqual(shopfront.productTxs[txID].buyer, accounts[2]);
        assert.strictEqual(shopfront.productTxs[txID].productID, 1);
      });
    });
    it("should let owner make payments or withdraw value from the contract.", function(){
      ownerBalance = owner.balance;
      web3.eth.getTransactionReceiptMined(sfTxHash)
      .then(function(receipt){
        return shopfront.withdraw(100000);
      })
      .then(function(){
        assert.strictEqual(ownerBalance.plus(100000).toString(), owner.balance);
      });
    });
  }); //describe Shopfront Basic
}); //contract
