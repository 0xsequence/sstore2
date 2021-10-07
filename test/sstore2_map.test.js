const { expect } = require('chai')
const { ethers } = require('hardhat')
const { chunksFromRange } = require('./utils')

const randomKey = () => ethers.utils.hexlify(ethers.utils.randomBytes(32))

describe('SSTORE2Map', function () {
  let sstore2Map

  beforeEach(async () => {
    const TestSSTORE2Map = await ethers.getContractFactory('TestSSTORE2Map')
    sstore2Map = await TestSSTORE2Map.deploy()
    await sstore2Map.deployed()
  })

  const keyTypes = [{
    name: 'hash',
    getKey: (i) => i,
    write: 'write1',
    read: ['read1', 'read2', 'read3'],
    addressOf: 'addressOf1'
  }, {
    name: 'string',
    getKey: (i) => `string-key-${i}`,
    write: 'write2',
    read: ['read4', 'read5', 'read6'],
    addressOf: 'addressOf2'
  }]

  it('Should use empty bytes32 key', async () => {
    const key = ethers.constants.HashZero
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(256))
    await sstore2Map.write1(key, data)
    expect(await sstore2Map.read1(key)).to.equal(data)
  })

  it('Should fail to use empty bytes32 key twice', async () => {
    const key = ethers.constants.HashZero
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
    await sstore2Map.write1(key, data)

    const data2 = ethers.utils.hexlify(ethers.utils.randomBytes(113))
    const tx = sstore2Map.write1(key, data2)
    await expect(tx).to.be.reverted
  })

  it('Should use empty string key', async () => {
    const key = ''
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(256))
    await sstore2Map.write2(key, data)
    expect(await sstore2Map.read4(key)).to.equal(data)
  })

  it('Should fail to use empty string key twice', async () => {
    const key = ''
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
    await sstore2Map.write2(key, data)

    const data2 = ethers.utils.hexlify(ethers.utils.randomBytes(113))
    const tx = sstore2Map.write2(key, data2)
    await expect(tx).to.be.reverted
  })

  describe('Using long key', () => {
    const key = `
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    `

    it('Should use long string key', async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(256))
      await sstore2Map.write2(key, data)
      expect(await sstore2Map.read4(key)).to.equal(data)
    })

    it('Should fail to use long string key twice', async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
      await sstore2Map.write2(key, data)

      const data2 = ethers.utils.hexlify(ethers.utils.randomBytes(113))
      const tx = sstore2Map.write2(key, data2)
      await expect(tx).to.be.reverted
    })
  })

  keyTypes.forEach(({ name, getKey, write, read, addressOf }) => {
    describe(`Using ${name} as keys`, () => {
      it('Should store and retrieve data', async () => {
        const key = getKey(randomKey())
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
        await sstore2Map[write](key, data)
        expect(await sstore2Map[read[0]](key)).to.equal(data)
      })

      it('Should fail to use the same key twice', async () => {
        const key = getKey(randomKey())
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
        await sstore2Map[write](key, data)

        const data2 = ethers.utils.hexlify(ethers.utils.randomBytes(113))
        const tx = sstore2Map[write](key, data2)
        await expect(tx).to.be.reverted
      })

      it('Should prefix child contract with 00', async () => {
        const key = getKey(randomKey())
        const data = ethers.utils.randomBytes(256)
        await sstore2Map[write](key, data)

        const address = await sstore2Map[addressOf](key)
        expect(await ethers.provider.getCode(address)).to.equal(ethers.utils.hexlify([0, ...data]))
      })

      it('Should write empty data', async () => {
        const key = getKey(randomKey())
        const data = '0x'

        await sstore2Map[write](key, data)
        expect(await sstore2Map[read[0]](key)).to.equal(data)
      })

      it('Should write below max contract size (24575 bytes)', async () => {
        const key = getKey(randomKey())
        const data = ethers.utils.hexlify(ethers.utils.randomBytes(24575))

        await sstore2Map[write](key, data, { gasLimit: 28000000 })
        expect(await sstore2Map[read[0]](key)).to.equal(data)
      })

      it('Should read empty key', async () => {
        const data = await sstore2Map[read[0]](getKey(ethers.utils.randomBytes(32)))
        expect(data).to.be.equal('0x')
      })

      if (!process.env.COVERAGE) {
        it('Should fail to write max contract size (24576 bytes)', async () => {
          const key = getKey(randomKey())
          const data = ethers.utils.hexlify(ethers.utils.randomBytes(24576))

          const tx = sstore2Map[write](key, data, { gasLimit: 28000000 })
          await expect(tx).to.be.reverted
        })
      }

      if (process.env.RANGE_TEST) {
        describe('Chunks of all sizes', async () => {
          chunksFromRange(24575, 256).forEach((v) => {
            it(`Should store and retrieve data sizes range from ${v[0]} to ${v[1]}`, async () => {
              for (let i = v[0]; i < v[1]; i++) {
                const key = getKey(randomKey())
                const data = ethers.utils.randomBytes(i)
                await sstore2Map[write](key, data, { gasLimit: 29000000 })
                const address = await sstore2Map[addressOf](key)

                expect(await sstore2Map[read[0]](key)).to.equal(ethers.utils.hexlify(data))
                expect(await ethers.provider.getCode(address)).to.equal(ethers.utils.hexlify([0, ...data]))

                if (i > 1) {
                  expect(await sstore2Map[read[1]](key, 1)).to.equal(ethers.utils.hexlify(data.slice(1)))
                }

                if (i > 2) {
                  expect(await sstore2Map[read[2]](key, 1, i - 1)).to.equal(ethers.utils.hexlify(data.slice(1, i - 1)))
                }
              }
            }).timeout(5 * 60 * 1000)
          })
        })
      }

      describe('Slice data', () => {
        let data
        let key

        beforeEach(async () => {
          data = ethers.utils.randomBytes(100)
          key = getKey(randomKey())
          await sstore2Map[write](key, data, { gasLimit: 28000000 })
        })

        it('Should retrieve 0 data', async () => {
          expect(await sstore2Map[read[1]](key, 100)).to.equal(ethers.utils.hexlify([]))
        })

        it('Should retrieve last byte', async () => {
          expect(await sstore2Map[read[1]](key, 99)).to.equal(ethers.utils.hexlify([data[data.length - 1]]))
        })

        it('Should retrieve first byte', async () => {
          expect(await sstore2Map[read[2]](key, 0, 1)).to.equal(ethers.utils.hexlify([data[0]]))
        })

        it('Should retrieve slice of data', async () => {
          expect(await sstore2Map[read[1]](key, 10)).to.equal(ethers.utils.hexlify(data.slice(10)))
        })

        it('Should retrieve slice of data (with end)', async () => {
          expect(await sstore2Map[read[2]](key, 10, 15)).to.equal(ethers.utils.hexlify(data.slice(10, 15)))
        })

        it('Should retrieve data if end is beyond end of file', async () => {
          expect(await sstore2Map[read[2]](key, 0, 200)).to.equal(ethers.utils.hexlify(data))
        })

        it('Should retrieve data if end is beyond end of file', async () => {
          expect(await sstore2Map[read[2]](key, 50, 200)).to.equal(ethers.utils.hexlify(data.slice(50)))
        })

        it('Should return empty bytes if _start is above end of file', async () => {
          const data = await sstore2Map[read[1]](key, 101)
          expect(data).to.be.equal('0x')
        })

        it('Should fail to retrieve slice if _end is below _start', async () => {
          const tx = sstore2Map[read[1]](key, 3, 2)
          await expect(tx).to.be.reverted
        })
      })
    })
  })
})
