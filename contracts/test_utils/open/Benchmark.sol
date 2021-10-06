// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../SSTORE2.sol";
import "../../SSTORE2Mapping.sol";


contract Benchmark {
  event Written(address _addr);

  mapping(bytes32 => bytes) private stored;

  function write1(bytes32 _key, bytes calldata _data) external {
    stored[_key] = _data;
  }

  function read1(bytes32 _key) external returns (bytes memory) {
    return stored[_key];
  }

  function write2(bytes32 _key, bytes calldata _data) external {
    SSTORE2Mapping.write(_key, _data);
  }

  function read2(bytes32 _key) external returns (bytes memory) {
    return SSTORE2Mapping.read(_key);
  }

  function write3(bytes calldata _data) external {
    emit Written(SSTORE2.write(_data));
  }

  function read3(address _key) external returns (bytes memory) {
    return SSTORE2.read(_key);
  }
}
