pragma solidity ^0.4.2;

contract Shopfront {

	address owner;

	struct Product{
		uint price;
		uint stock;
	}

	struct ProductTx{
		address buyer;
		uint productID;
		uint timestamp;
	}

	uint public numProducts;
	uint public numTxs;
	mapping (uint=>Product) public products;
	ProductTx[] public productTxs;

	function Shopfront(){
		owner = msg.sender;
	}

	function newProduct(uint _price, uint _stock) returns (uint productID) {
		if(msg.sender == owner){
			productID = numProducts++;
			products[productID] = Product(_price, _stock);
			return productID;
		}
	}

	function buy(uint productID) payable returns (uint txID) {
		if(products[productID].stock > 0 && msg.value >= products[productID].price){
			txID = productTxs.push(ProductTx(msg.sender, productID, now));
			products[productID].stock--;
			return txID;
		}
	}

	function withdraw(uint value) returns (bool){
		if(msg.sender == owner){
			if(!owner.send(value)){
				throw;
			}
			return true;
		}
	}

	function kill() returns (bool) {
        if (msg.sender == owner) {
            selfdestruct(owner);
            return true;
        }
    }

}