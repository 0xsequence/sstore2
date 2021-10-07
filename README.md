# SLOAD2 & SLOAD2-Map

SLOAD2 is a set of Solidity libraries for writing and reading contract storage paying a fraction of the cost, it uses contract code as storage, writing data takes the form of contract creations and reading data uses `EXTCODECOPY`.

## Features

- All SLOAD2 storages are write-once only
- Key Value storage (custom key and auto-gen key)
- Cheaper storage reads (vs SLOAD) after 32 bytes
- Cheaper storage writes (vs SSTORE) after 32 bytes (auto-gen key)
- Cheaper storage writes (vs SSTORE) after 96 bytes (custom key)
- Use strings as keys
- Use bytes32 as keys
- Use address as keys (auto-gen)

## Gas savings

Gas costs are overall lower compared with traditional SSTORED and SLOAD operations, SLOAD2 (auto-generated key) and SLOAD2-Map (custom key) have different costs associated with using them.

The root cause is that custom-key SLOAD2 needs to use CREATE3 to deploy the data contract, and CREATE3 needs to deploy an aditional proxy contract for each deployed contract.

### SLOAD Cost (data read)

Reading data is a lot cheaper compared to native SLOAD operations (native solidity storage).

After reading 32 bytes `SSTORE2.read` becomes the cheaper option, and `SSTORE2Map.read` becomes cheaper when reading 33 bytes or more.

| SIZE  | SLOAD   | SLOAD2 | SLOAD2 - Map |
|-------|---------|--------|--------------|
|     0 |   25135 |  25534 |        27741 |
|    32 |   27448 |  25618 |        27825 |
|    33 |   29697 |  25717 |        27921 |
|    64 |   29679 |  25702 |        27909 |
|    96 |   31910 |  25774 |        27994 |
|   128 |   34141 |  25870 |        28078 |
|   256 |   43066 |  26207 |        28415 |
|   512 |   60915 |  26881 |        29089 |
|  1024 |   96618 |  28232 |        30441 |
| 24576 | 1422666 |  81124 |        83364 |

![SSTORE Cost](./images/sload_cost.svg)

### SSTORE Cost (data writes)

Writing data is also a lot cheaper compared to native SSTORE operations (native solidity storage), but gains become aparent after higher data sizes.

After writing 32 bytes `SSTORE2.write` becomes the cheaper option, and `SSTORE2Map.write` becomes cheaper only when writting 96 bytes or more.

| SIZE  | SSTORE   | SSTORE2 | SSTORE2 - Map |
|-------|----------|---------|---------------|
|     0 |    25138 |   57097 |        101312 |
|    32 |    67812 |   64189 |        108489 |
|    64 |    90494 |   71269 |        115653 |
|    96 |   113176 |   78349 |        122818 |
|   128 |   135858 |   85429 |        129982 |
|   256 |   226574 |  113739 |        158629 |
|   512 |   408006 |  170359 |        215925 |
|  1024 |   770870 |  283608 |        330534 |
| 24576 | 14220516 | 4488942 |       4591893 |

![SSTORE Cost](./images/sstore_cost.svg)

## Installation

`yarn add https://github.com/0xsequence/sstore2`

or

`npm install --save https://github.com/0xsequence/sstore2`

## Usage

SSTORE2 comes in two flavors, `SSTORE2` and `SSTORE2Map`. The main difference is that `SSTORE2` auto-generates a key or "pointer" for later data reads, and `SSTORE2Map` let's you use a custom pointer in the form of a `bytes32` key.

`SSTORE2` is cheaper because it only needs to use `CREATE`. `SSTORE2Map` is a little more expensive (~ +50k gas) because it makes use of [CREATE3](https://github.com/0xsequence/create3), which requires using both CREATE2 + CREATE at the same time.


## SSTORE2

Calling `SSTORE2.write` with some `data` returns an `address` pointer, this pointer address can later be feed into `SSTORE2.read` to retrieve the same `data`. Every time `write` is called it generates a new pointer, pointers can't be deleted.

```solidity
pragma solidity ^0.8.0;

import "@0xsequence/sstore2/contracts/SSTORE2.sol";


contract Demo {
  address private pointer;

  function setText(string calldata _text) external {
    pointer = SSTORE2.write(bytes(_text));
  }

  function getText() external view returns (string memory) {
    return string(SSTORE2.read(pointer));
  }
}
```

### Arbitrary size immutables

Solidity 0.8.9 doesn't support variable size immutable variables, these can be emulated using SSTORE2 and immutable pointers.

```solidity
pragma solidity ^0.8.0;

import "@0xsequence/sstore2/contracts/SSTORE2.sol";


contract Demo {
  address private immutable dataPointer;

  constructor(bytes memory _data) {
    dataPointer = SSTORE2.write(_data);
  }

  function getData() external view returns (bytes memory) {
    return SSTORE2.read(dataPointer);
  }
}

contract Broken {
  // Fails to build, non-primite types
  // can't be used as immutable variables

  bytes private immutable data;

  constructor(bytes memory _data) {
    data = _data;
  }
}

```

## SSTORE2Map

SSTORE2Map behaves similarly to SSTORE2, but instead of auto-generating a pointer on each `SSTORE2Map.write` call it takes an arbitrary `key` in the form of a `bytes32` variable, this key must later be provided to `SSTORE2Map.read` to retrieve the written value.

The map store is also write-once, meaning that calling `SSTORE2Map.write` TWICE with the same key will fail. There is no mechanism for deleting or removing the value of a given key.

```solidity
pragma solidity ^0.8.0;

import "@0xsequence/sstore2/contracts/SSTORE2Map.sol";


contract Demo {
  bytes32 private constant KEY = 0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3;

  function setHashes(bytes32[] calldata _hashes) external {
    SSTORE2Map.write(KEY, abi.encode(_hashes));
  }

  function getHashes() external view returns (bytes32[] memory) {
    return abi.decode(SSTORE2Map.read(KEY), (bytes32[]));
  }
}

```

### Using multiple keys

SSTORE2Map supports using multiple keys at the same time, but re-using a key will result in failure.

```solidity
pragma solidity ^0.8.0;

import "@0xsequence/sstore2/contracts/SSTORE2Map.sol";


contract Demo {
  // This works
  function good() external {
    SSTORE2Map.write("@key-1", bytes("hola"));
    SSTORE2Map.write("@key-2", bytes("mundo"));
  }

  // This reverts
  function bad() external {
    SSTORE2Map.write("@key-3", bytes("adios"));
    SSTORE2Map.write("@key-3", bytes("mundo"));
  }
}

```

> Notice: `strings` can be used as `SSTORE2Map`, they get interanally mapped as `keccak256(bytes(<string>)`.

# Reading slices

Both `SSTORE2` and `SSTORE2Map` support reading slices of data, this behaviors mirrors javascript's `.slice(start, end)`.

The functionality can be used for future-proofing a contract in case that code merkelization is ever implemented.

```solidity
pragma solidity ^0.8.0;

import "@0xsequence/sstore2/contracts/SSTORE2.sol";


contract Demo {
  event Sliced(bytes _data);

  function goodSlices() external {
    address pointer = SSTORE2.write(hex"11_22_33_44");

    // 0x223344
    emit Sliced(
      SSTORE2.read(pointer, 1)
    );

    // 0x2233
    emit Sliced(
      SSTORE2.read(pointer, 1, 3)
    );

    // 0x
    emit Sliced(
      SSTORE2.read(pointer, 3, 3)
    );

    // 0x3344
    emit Sliced(
      SSTORE2.read(pointer, 2, 42000)
    );
  }

  function badSlies() external {
    address pointer = SSTORE2.write(hex"11_22_33_44");

    // This reverts
    // start must be equal or lower than end
    emit Sliced(
      SSTORE2.read(pointer, 3, 2)
    );

    // This reverts
    // start must be below of end of data
    emit Sliced(
      SSTORE2.read(pointer, 4)
    );
  }
}

```

# License

```
MIT License

Copyright (c) [2018] [Ismael Ramos Silvan]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```