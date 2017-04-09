var accounts;
var account;
var customer;
var shopfront;
var productCreatedEvent;
var productCreatedResults;
var productBoughtEvent;

function addProduct(){
  var price = document.getElementById("price").value;
  var stock = document.getElementById("stock").value;

  return shopfront.addProduct(web3.toWei(price,"ether"), stock, {from:account})
  .then(web3.eth.getTransactionReceiptMined)
  .then(function(receipt){
    console.log("receipt: ");
    console.log(receipt);
    event = shopfront.OnProductCreated().formatter(receipt.logs[0]);
    console.log(event.args.productID);
    console.log(event.args.price.toString(10));
    console.log(event.args.stock);
    showProductList();
  })
  .catch(function(e){
    console.log(e);
  });
}

function showProductList(){
  productCreatedResults = productCreatedEvent.get(function(error, logs){
    if(!error)
      logs.forEach(function(log, index){
        console.log(log);
        console.log('logs[' + index + '].pID = ' + log.args.productID);
        console.log('logs[' + index + '].price = ' + log.args.price.toString(10));
        console.log('logs[' + index + '].stock = ' + log.args.stock);
        pTable = document.getElementById("pTable");
        pTable.innerHTML = pTable.innerHTML + "<tr><td>"+log.args.productID+"</td><td>"+web3.fromWei(log.args.price.toString(10), "ether")+"</td><td>"+log.args.stock+"</td><td id=\"stockleft"+log.args.productID+"\"></td><td><button id=\"buyProduct\" onclick=\"buyProduct("+log.args.productID+","+log.args.price+")\">Buy</button></td></tr>";
        getProductStock(log.args.productID);
      });
  });
}

function showProduct(){
  var pID = document.getElementById("pID").value;
  return shopfront.products(pID)
  .then(function(product){
    console.log(product[0].toString(10));
    console.log(product[1]);
    pInfoTable = document.getElementById("pInfoTable");
    pInfoTable.innerHTML = "<tr><td>"+pID+"</td><td>"+web3.fromWei(product[0].toString(10), "ether")+"</td><td>"+product[1]+"</td></tr>";
  });
}

function getProductStock(pID){
  return shopfront.products(pID)
  .then(function(product){
    console.log("stock:"+product[1]);
    document.getElementById("stockleft"+pID).innerHTML = product[1];
  });
}

function buyProduct(pID, price){
  return shopfront.buy(pID, {from:customer, value:price})
  .then(web3.eth.getTransactionReceiptMined)
  .then(function(receipt){
      event = shopfront.OnProductBought().formatter(receipt.logs[0]);
      console.log(event.args.buyer.toString());
      console.log(event.args.productID);
      console.log(event.args.price.toString(10));
      setStatus("Purchase is done.<br />Transaction Hash: "+receipt.transactionHash);
      return shopfront.products(pID);
  })
  .then(function(product){
    console.log("stock:"+product[1]);
    document.getElementById("stockleft"+pID).innerHTML = product[1];
  });
}

function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

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
    customer = accounts[1];
  });

  shopfront = Shopfront.deployed();

  productCreatedEvent = shopfront.OnProductCreated({fromBlock: 0, toBlock: 'latest'});
  productBoughtEvent = shopfront.OnProductBought({fromBlock: 0, toBlock: 'latest'});

  showProductList();

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
