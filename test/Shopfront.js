const Extensions = require("../utils/extensions.js");
Extensions.init(web3, assert);

contract('Shopfront', function(accounts) {
  
  describe("Shopfront Basic", function(){

    var shopfront;
    var owner = accounts[0];

    describe('add products', function() {

        before("should create a shopfront", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
            shopfront = created;
            return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          });
        });

        var products = [
          {price: web3.toWei(9, "finney"), stock: 10},
          {price: web3.toWei(8, "finney"), stock: 8},
          {price: web3.toWei(7, "finney"), stock: 762},
        ];

        return products.forEach(function(product){

            it("should add products("+products.indexOf(product)+"), which consist of an id, a price and a stock as an owner", function() {

                return shopfront.newProduct.call(product.price, product.stock, {from:owner})
                .then(function(success){
                    assert.isTrue(success, "should be possible for owner to add a product");
                    return shopfront.newProduct(product.price, product.stock, {from:owner});
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(function(receipt){
                  return shopfront.OnProductCreated().formatter(receipt.logs[0]);
                })
                .then(function(event){
                  pID = event.args.productID;
                  assert.strictEqual(pID.toString(), products.indexOf(product).toString(), "pID should be "+products.indexOf(product));
                  return shopfront.products(pID);
                })
                .then(function(result){
                  //console.log("Product"+products.indexOf(product)+" Price:"+result[0]+", Stock:"+result[1]);
                  assert.strictEqual(result[0].toString(), product.price.toString(), "should be the setted price");
                  assert.strictEqual(result[1].toString(), product.stock.toString(), "should be the setted stock");
                });
            });
        });
    });
    
    describe('buy products', function(){

        var product = {price: web3.toWei(9, "finney"), stock: 10};

        beforeEach("should create a shopfront with products", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          })
          .then(function(receipt){
              return shopfront.newProduct(product.price, product.stock, {from:owner});
          })
          .then(web3.eth.getTransactionReceiptMined);
        });

        it("should let a regular user buy 1 of the products", function(){

          var customer = accounts[1];

          return shopfront.buy.call(0, {from:customer, value:product.price})
          .then(function(success){
              assert.isTrue(success);
              return shopfront.buy(0, {from:customer, value:product.price});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(function(receipt){
              return shopfront.OnProductBought().formatter(receipt.logs[0]);
          })
          .then(function(event){
            //console.log("Buyer:"+events[0].args.buyer+", Product:"+events[0].args.productID+", Price:"+events[0].args.price);
            assert.strictEqual(event.args.buyer.toString(), customer.toString(), "buyer should be customer");
            assert.strictEqual(event.args.productID.toString(), '0', "productID should be 0");
            assert.strictEqual(event.args.price.toString(), product.price.toString(), "price should be the setted price");
            return shopfront.products(0);
          })
          .then(function(result){
            assert.strictEqual(result[1].toString(), '9', "stock should be 9");
          });
        });

    });

    describe('owner can make payments and withdraw from the contract', function(){

        var product = {price: web3.toWei(9, "finney"), stock: 10};
        var ownerBalanceBefore, contractBalanceBefore, payeeBalanceBefore;
        var customer = accounts[1];
        var payee = accounts[2];

        beforeEach("should create a shopfront with balance", function(){
          return Shopfront.new({from:owner})
          .then(function(created){
             shopfront = created;
             return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
          })
          .then(function(receipt){
              return shopfront.newProduct(product.price, product.stock, {from:owner});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(function(receipt){
            return shopfront.buy(0, {from:customer, value:product.price});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(function(receipt){
            return web3.eth.getBalancePromise(shopfront.address);
          })
          .then(result=>{
            contractBalanceBefore = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceBefore = result;
            return web3.eth.getBalancePromise(payee);
          })
          .then(result=>{
            payeeBalanceBefore = result;
          });
        });

        it("should let owner pay some value from the contract.", function(){
          
          var contractBalanceAfter, payeeBalanceAfter;

          return shopfront.pay.call(accounts[2], web3.toWei(1, "finney"), {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.pay(accounts[2], web3.toWei(1, "finney"), {owner});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(accounts[2]);
          })
          .then(result=>{
            payeeBalanceAfter = result;
            assert.strictEqual(contractBalanceAfter.toString(10), contractBalanceBefore.minus(web3.toWei(1, "finney")).toString(10), "contract balance should loss 1 finney");
            assert.strictEqual(payeeBalanceAfter.toString(10), payeeBalanceBefore.plus(web3.toWei(1, "finney")).toString(10), "payee's balance should gain 1 finney");
          });
        });

        it("should let owner pay all value from the contract.", function(){
          
          var contractBalanceAfter, payeeBalanceAfter;
          
          return shopfront.pay.call(accounts[2], contractBalanceBefore, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.pay(accounts[2], contractBalanceBefore, {owner});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(receipt=>{
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(accounts[2]);
          })
          .then(result=>{
            payeeBalanceAfter = result;
            assert.strictEqual(contractBalanceAfter.toString(10), '0', "contract balance should be 0");
            assert.strictEqual(payeeBalanceAfter.toString(10), payeeBalanceBefore.plus(contractBalanceBefore).toString(10), "payee's balance should gain 0.9 ether");
          });
        });

        it("should let owner withdraw 0 from the contract.", function(){
          var contractBalanceAfter, ownerBalanceAfter, gasUsed;
          
          return shopfront.withdraw.call(0, {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.withdraw(0, {owner});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(receipt=>{
            gasUsed = receipt.gasUsed;
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceAfter = result;
            assert.strictEqual(contractBalanceAfter.toString(10), contractBalanceBefore.toString(10), "contract balance should be the same");
            console.log("gasPrice: "+web3.eth.gasPrice);
            console.log("gasUsed: "+gasUsed);
            console.log("gasPrice*gasUsed: "+web3.eth.gasPrice*gasUsed);
            console.log("Balance diff:"+ownerBalanceBefore.minus(ownerBalanceAfter).toString(10));
            assert.strictEqual(ownerBalanceAfter.toString(10), ownerBalanceBefore.minus(web3.eth.gasPrice*gasUsed).toString(10), "owner's balance should be the same");
          });
        });


        it("should let owner withdraw some value from the contract.", function(){
          var contractBalanceAfter, ownerBalanceAfter, gasUsed;
          
          return shopfront.withdraw.call(web3.toWei(1, "finney"), {owner})
          .then(success=>{
            assert.isTrue(success);
            return shopfront.withdraw(web3.toWei(1, "finney"), {owner});
          })
          .then(web3.eth.getTransactionReceiptMined)
          .then(receipt=>{
            gasUsed = receipt.gasUsed;
            return web3.eth.getBalancePromise(shopfront.address)
          })
          .then(result=>{
            contractBalanceAfter = result;
            return web3.eth.getBalancePromise(owner);
          })
          .then(result=>{
            ownerBalanceAfter = result;
            assert.strictEqual(contractBalanceAfter.toString(10), contractBalanceBefore.minus(web3.toWei(1, "finney")).toString(10), "contract balance should loss 1 finney");
            assert.strictEqual(ownerBalanceAfter.toString(10), ownerBalanceBefore.minus(web3.eth.gasPrice*gasUsed).plus(web3.toWei(1, "finney")).toString(10), "owner's balance should gain 1 finney");
          });
        });

    });

  });


});
