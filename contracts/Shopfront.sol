pragma solidity ^0.4.2;

contract Owned {
	address owner;

	function Owned(){
		owner = msg.sender;
	}

	modifier onlyOwner {
        if (msg.sender != owner) throw;
        _;
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

	function newProduct(uint _price, uint _stock) onlyOwner() returns (bool) {
		productID = numProducts;
		products[productID] = Product(_price, _stock);
		OnProductCreated(productID, _price, _stock);
		numProducts = productID + 1;
		return true;
	}

	function buy(uint productID) payable returns (bool){
		if(products[productID].stock > 0 && msg.value >= products[productID].price){
			products[productID].stock--;
			OnProductBought(msg.sender, productID, msg.value);
			return true;
		}
	}

	function pay(address account, uint value) onlyOwner() returns (bool){
		if(!account.send(value)) throw;
		return true;
	}

	function withdraw(uint value) onlyOwner() returns (bool){
		if(!owner.send(value)) throw;
		return true;
	}

	function kill() onlyOwner() returns (bool) {
        selfdestruct(owner);
        return true;
    }

}