pragma solidity ^0.4.2;

import "./Owned.sol";

contract Shopfront is Owned {

	struct Product{
		uint price;
		uint stock;
	}

	uint public numProducts;
	mapping (uint=>Product) public products;

	event OnProductCreated(uint indexed productID, uint price, uint stock);
	event OnProductBought(address indexed buyer, uint productID, uint price);

	function Shopfront(){
		numProducts = 0;
	}

	function newProduct(uint _price, uint _stock) onlyOwner() returns (bool) {
		products[numProducts] = Product(_price, _stock);
		OnProductCreated(numProducts, _price, _stock);
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