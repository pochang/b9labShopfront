var accounts;
var account;
var shopfront;
var productCreatedEvent;

function newProduct(){
  var price = parseInt(document.getElementById("price").value);
  var stock = parseInt(document.getElementById("stock").value);

  shopfront.newProduct(price,stock, {from:account})
  .then(function(txHash){
    return web3.eth.getTransactionReceiptMined(txHash);
  })
  .then(function(receipt){
    console.log("receipt: "+receipt);
    return productCreatedEvent.watchPromise();
  })
  .then(function(result){
      console.log(result);
  })
  .catch(function(e){
    console.log(e);
  });
}

function showProduct(){
  var pID = parseInt(document.getElementById("pID").value);
  shopfront.products(pID)
  .then(function(product){
    console.log(product);
  });
}

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];
  });

  shopfront = Shopfront.deployed();
  productCreatedEvent = shopfront.OnProductCreated();
  /*
  productCreatedEvent.watch(function(error, result){
    if(!error){
      console.log(result);
    }else{
      console.log(error);
    }
  });
  */
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
  
}
