// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@0xsequence/create3/contracts/Create3.sol";

import "../../SSTORE2Map.sol";


contract TestSSTORE2Map {
  function write1(bytes32 _key, bytes calldata _data) external returns (address pointer) {
    return SSTORE2Map.write(_key, _data);
  }

  function write2(string calldata _key, bytes calldata _data) external returns (address pointer) {
    return SSTORE2Map.write(_key, _data);
  }

  function read1(bytes32 _key) external view returns (bytes memory) {
    return SSTORE2Map.read(_key);
  }

  function read2(bytes32 _key, uint256 _start) external view returns (bytes memory) {
    return SSTORE2Map.read(_key, _start);
  }

  function read3(bytes32 _key, uint256 _start, uint256 _end) external view returns (bytes memory) {
    return SSTORE2Map.read(_key, _start, _end);
  }

  function read4(string calldata _key) external view returns (bytes memory) {
    return SSTORE2Map.read(_key);
  }

  function read5(string calldata _key, uint256 _start) external view returns (bytes memory) {
    return SSTORE2Map.read(_key, _start);
  }

  function read6(string calldata _key, uint256 _start, uint256 _end) external view returns (bytes memory) {
    return SSTORE2Map.read(_key, _start, _end);
  }

  function addressOf1(bytes32 _key) external view returns (address) {
    return Create3.addressOf(SSTORE2Map.internalKey(_key));
  }

  function addressOf2(string calldata _key) external view returns (address) {
    return Create3.addressOf(SSTORE2Map.internalKey(keccak256(bytes(_key))));
  }
}
