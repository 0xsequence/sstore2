// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../SSTORE2.sol";


contract TestSSTORE2 {
  event Written(address _addr);

  function write(bytes calldata _data) external returns (address pointer) {
    pointer = SSTORE2.write(_data);
    emit Written(pointer);
  }

  function read1(address _pointer) external view returns (bytes memory) {
    return SSTORE2.read(_pointer);
  }

  function read2(address _pointer, uint256 _start) external view returns (bytes memory) {
    return SSTORE2.read(_pointer, _start);
  }

  function read3(address _pointer, uint256 _start, uint256 _end) external view returns (bytes memory) {
    return SSTORE2.read(_pointer, _start, _end);
  }
}
