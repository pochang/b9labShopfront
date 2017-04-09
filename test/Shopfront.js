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

            return products.forEach(function(product, index){

                it("should add products("+index+"), which consist of an id, a price and a stock as an owner", function() {

                    return shopfront.addProduct.call(product.price, product.stock, {from:owner})
                    .then(function(success){
                        assert.isTrue(success, "should be possible for owner to add a product");
                        return shopfront.addProduct(product.price, product.stock, {from:owner});
                    })
                    .then(web3.eth.getTransactionReceiptMined)
                    .then(function(receipt){
                        var event = shopfront.OnProductCreated().formatter(receipt.logs[0]);
                        assert.strictEqual(event.args.productID.toString(10), index.toString(10), "productID should be "+index);
                        assert.strictEqual(event.args.price.toString(10), product.price.toString(10), "should be the setted price");
                        assert.strictEqual(event.args.stock.toString(10), product.stock.toString(10), "should be the setted stock");
                        return shopfront.products(index);
                    })
                    .then(function(result){
                        //console.log("Product"+index+" Price:"+result[0]+", Stock:"+result[1]);
                        assert.strictEqual(result[0].toString(10), product.price.toString(10), "should be the setted price");
                        assert.strictEqual(result[1].toString(10), product.stock.toString(10), "should be the setted stock");
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
                    return shopfront.addProduct(product.price, product.stock, {from:owner});
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
                    var event = shopfront.OnProductBought().formatter(receipt.logs[0]);
                    //console.log("Buyer:"+event.args.buyer+", Product:"+event.args.productID+", Price:"+event.args.price);
                    assert.strictEqual(event.args.buyer.toString(10), customer.toString(10), "buyer should be customer");
                    assert.strictEqual(event.args.productID.toString(10), '0', "productID should be 0");
                    assert.strictEqual(event.args.price.toString(10), product.price.toString(10), "price should be the setted price");
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
            var amount = web3.toWei(1, "finney")

            beforeEach("should create a shopfront with balance", function(){
                return Shopfront.new({from:owner})
                .then(function(created){
                    shopfront = created;
                    return web3.eth.getTransactionReceiptMined(shopfront.transactionHash);
                })
                .then(function(receipt){
                    return shopfront.addProduct(product.price, product.stock, {from:owner});
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

                return shopfront.pay.call(payee, amount, {from: owner})
                .then(success=>{
                    assert.isTrue(success);
                    return shopfront.pay(payee, amount, {from: owner});
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt=>{
                    return web3.eth.getBalancePromise(shopfront.address)
                })
                .then(result=>{
                    contractBalanceAfter = result;
                    return web3.eth.getBalancePromise(payee);
                })
                .then(result=>{
                    payeeBalanceAfter = result;
                    assert.strictEqual(contractBalanceAfter.toString(10), contractBalanceBefore.minus(amount).toString(10), "contract balance should loss 1 finney");
                    assert.strictEqual(payeeBalanceAfter.toString(10), payeeBalanceBefore.plus(amount).toString(10), "payee's balance should gain 1 finney");
                });
            });

            it("should let owner pay all value from the contract.", function(){
              
                var contractBalanceAfter, payeeBalanceAfter;
                
                return shopfront.pay.call(payee, contractBalanceBefore, {from: owner})
                .then(success=>{
                    assert.isTrue(success);
                    return shopfront.pay(payee, contractBalanceBefore, {from: owner});
                })
                .then(web3.eth.getTransactionReceiptMined)
                .then(receipt=>{
                    return web3.eth.getBalancePromise(shopfront.address)
                })
                .then(result=>{
                    contractBalanceAfter = result;
                    return web3.eth.getBalancePromise(payee);
                })
                .then(result=>{
                    payeeBalanceAfter = result;
                    assert.strictEqual(contractBalanceAfter.toString(10), '0', "contract balance should be 0");
                    assert.strictEqual(payeeBalanceAfter.toString(10), payeeBalanceBefore.plus(contractBalanceBefore).toString(10), "payee's balance should gain 0.9 ether");
                });
            });

            it("should let owner withdraw 0 from the contract.", function(){
                var contractBalanceAfter, ownerBalanceAfter, gasUsed, gasPrice;
                
                return shopfront.withdraw.call(0, {from: owner})
                .then(success=>{
                    assert.isTrue(success);
                    return shopfront.withdraw(0, {from: owner});
                })
                .then(txHash=>{
                    return web3.eth.getTransaction(txHash);
                })
                .then(txObj=>{
                    gasPrice = txObj.gasPrice;
                    return web3.eth.getTransactionReceiptMined(txObj.hash);
                })
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
                    console.log("gasPrice: "+gasPrice);
                    console.log("gasUsed: "+gasUsed);
                    console.log("gasPrice*gasUsed: "+gasPrice*gasUsed);
                    console.log("Balance diff:"+ownerBalanceBefore.minus(ownerBalanceAfter).toString(10));
                    assert.strictEqual(ownerBalanceAfter.toString(10), ownerBalanceBefore.minus(gasPrice*gasUsed).toString(10), "owner's balance should be the same");
                });
            });


            it("should let owner withdraw some value from the contract.", function(){
                var contractBalanceAfter, ownerBalanceAfter, gasUsed, gasPrice;
                
                return shopfront.withdraw.call(amount, {from: owner})
                .then(success=>{
                    assert.isTrue(success);
                    return shopfront.withdraw(amount, {from: owner});
                })
                .then(txHash=>{
                    return web3.eth.getTransaction(txHash);
                })
                .then(txObj=>{
                    gasPrice = txObj.gasPrice;
                    return web3.eth.getTransactionReceiptMined(txObj.hash);
                })
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
                    assert.strictEqual(contractBalanceAfter.toString(10), contractBalanceBefore.minus(amount).toString(10), "contract balance should loss 1 finney");
                    assert.strictEqual(ownerBalanceAfter.toString(10), ownerBalanceBefore.minus(gasPrice*gasUsed).plus(amount).toString(10), "owner's balance should gain 1 finney");
                });
            });
        });
    });
});
