pragma solidity ^0.4.2;

contract Owned {
	address owner;

	function Owned(){
		owner = msg.sender;
	}
}

contract Shopfront is Owned {

	struct Product{
		uint price;
		uint stock;
	}

	uint public numProducts;
	uint public productID;
	mapping (uint=>Product) public products;

	event OnProductCreated(uint indexed productID, uint price, uint stock);
	event OnProductBought(address indexed buyer, uint productID, uint price);

	function Shopfront(){
		numProducts = 0;
	}

	modifier onlyMe () {
        if (msg.sender != owner) throw;
        _;
    }

	function newProduct(uint _price, uint _stock) onlyMe() returns (bool) {
		productID = numProducts;
		products[productID] = Product(_price, _stock);
		OnProductCreated(productID, _price, _stock);
		numProducts++;
		return true;
	}

	function buy(uint productID) payable returns (bool){
		if(products[productID].stock > 0 && msg.value >= products[productID].price){
			products[productID].stock--;
			OnProductBought(msg.sender, productID, msg.value);
			return true;
		}
	}

	function withdraw(uint value) returns (bool){
		if(msg.sender != owner) throw;
		if(!owner.send(value)) throw;
		return true;
	}

	function kill() returns (bool) {
        if (msg.sender == owner) {
            selfdestruct(owner);
            return true;
        }
    }

}