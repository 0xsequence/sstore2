// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@0xsequence/create3/contracts/Create3.sol";

import "./utils/Bytecode.sol";


library SSTORE2Mapping {
  error WriteError();

  //                                         keccak256(bytes('@0xSequence.SSTORE2Mapping.slot'))
  bytes32 private constant SLOT_KEY_PREFIX = 0x76aeb1768b9135311a3bd386e2e4c4e6f09dd72058d7573c591826b7b2760c14;

  function internalKey(bytes32 _key) internal pure returns (bytes32) {
    // Mutate the key so it doesn't collide
    // if the contract is also using CREATE3 for other things
    return keccak256(abi.encode(SLOT_KEY_PREFIX, _key));
  }

  function write(string memory _key, bytes memory _data) internal returns (address pointer) {
    return write(keccak256(bytes(_key)), _data);
  }

  function write(bytes32 _key, bytes memory _data) internal returns (address pointer) {
    // Append 00 to _data so contract can't be called
    // Build init code
    bytes memory code = Bytecode.creationCodeFor(
      abi.encodePacked(
        hex'00',
        _data
      )
    );

    // Deploy contract using create3
    pointer = Create3.create3(internalKey(_key), code);
  }

  function read(string memory _key) internal view returns (bytes memory) {
    return read(keccak256(bytes(_key)));
  }

  function read(string memory _key, uint256 _start) internal view returns (bytes memory) {
    return read(keccak256(bytes(_key)), _start);
  }

  function read(string memory _key, uint256 _start, uint256 _end) internal view returns (bytes memory) {
    return read(keccak256(bytes(_key)), _start, _end);
  }

  function read(bytes32 _key) internal view returns (bytes memory) {
    return Bytecode.codeAt(Create3.addressOf(internalKey(_key)), 1, type(uint256).max);
  }

  function read(bytes32 _key, uint256 _start) internal view returns (bytes memory) {
    return Bytecode.codeAt(Create3.addressOf(internalKey(_key)), _start + 1, type(uint256).max);
  }

  function read(bytes32 _key, uint256 _start, uint256 _end) internal view returns (bytes memory) {
    return Bytecode.codeAt(Create3.addressOf(internalKey(_key)), _start + 1, _end + 1);
  }
}
