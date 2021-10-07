const { expect } = require('chai')
const { ethers } = require('hardhat')
const { chunksFromRange } = require('./utils')

async function addressFromWrite (tx) {
  const log = (await (await tx).wait()).logs[0]
  return ethers.utils.defaultAbiCoder.decode(['address'], log.data)[0]
}

describe('SSTORE2', function () {
  let sstore2

  beforeEach(async () => {
    const TestSSTORE2 = await ethers.getContractFactory('TestSSTORE2')
    sstore2 = await TestSSTORE2.deploy()
    await sstore2.deployed()
  })

  it('Should store and retrieve data', async () => {
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(113))
    const pointer = await addressFromWrite(sstore2.write(data))
    expect(await sstore2.read1(pointer)).to.equal(data)
  })

  it('Child contract must be prefixed with 00', async () => {
    const data = ethers.utils.randomBytes(113)
    const pointer = await addressFromWrite(sstore2.write(data))
    expect(await ethers.provider.getCode(pointer)).to.equal(ethers.utils.hexlify([0, ...data]))
  })

  it('Should write empty data', async () => {
    const pointer = await addressFromWrite(sstore2.write('0x'))
    expect(await sstore2.read1(pointer)).to.equal('0x')
  })

  it('Should write below max contract size (24575 bytes)', async () => {
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(24575))
    const pointer = await addressFromWrite(sstore2.write(data, { gasLimit: 29000000 }))
    expect(await sstore2.read1(pointer)).to.equal(data)
  })

  it('Should return empty code for random pointer', async () => {
    const pointer = ethers.Wallet.createRandom().address
    expect(await sstore2.read1(pointer)).to.equal('0x')
  })

  it('Should read empty pointer', async () => {
    const data = await sstore2.read1(ethers.Wallet.createRandom().address)
    expect(data).to.be.equal('0x')
  })

  if (!process.env.COVERAGE) {
    it('Should fail to write max contract size (24576 bytes)', async () => {
      const data = ethers.utils.hexlify(ethers.utils.randomBytes(24576))
      const tx = sstore2.write(data, { gasLimit: 29000000 })
      await expect(tx).to.be.reverted
    })
  }

  describe('Slice data', () => {
    let data
    let pointer

    beforeEach(async () => {
      data = ethers.utils.randomBytes(100)
      pointer = await addressFromWrite(sstore2.write(data))
    })

    it('Should retrieve 0 data', async () => {
      expect(await sstore2.read2(pointer, 100)).to.equal(ethers.utils.hexlify([]))
    })

    it('Should retrieve last byte', async () => {
      expect(await sstore2.read2(pointer, 99)).to.equal(ethers.utils.hexlify([data[data.length - 1]]))
    })

    it('Should retrieve first byte', async () => {
      expect(await sstore2.read3(pointer, 0, 1)).to.equal(ethers.utils.hexlify([data[0]]))
    })

    it('Should retrieve slice of data', async () => {
      expect(await sstore2.read2(pointer, 10)).to.equal(ethers.utils.hexlify(data.slice(10)))
    })

    it('Should retrieve slice of data (with end)', async () => {
      expect(await sstore2.read3(pointer, 10, 15)).to.equal(ethers.utils.hexlify(data.slice(10, 15)))
    })

    it('Should retrieve data if end is beyond end of file', async () => {
      expect(await sstore2.read3(pointer, 0, 200)).to.equal(ethers.utils.hexlify(data))
    })

    it('Should retrieve data if end is beyond end of file', async () => {
      expect(await sstore2.read3(pointer, 50, 200)).to.equal(ethers.utils.hexlify(data.slice(50)))
    })

    it('Should return empty bytes if _start is above end of file', async () => {
      const data = await sstore2.read2(pointer, 101)
      expect(data).to.be.equal('0x')
    })

    it('Should fail to retrieve slice if _end is below _start', async () => {
      const tx = sstore2.read2(pointer, 3, 2)
      await expect(tx).to.be.reverted
    })
  })

  if (process.env.RANGE_TEST) {
    describe('Chunks of all sizes', async () => {
      chunksFromRange(24575, 256).forEach((v) => {
        it(`Should store and retrieve data sizes range from ${v[0]} to ${v[1]}`, async () => {
          for (let i = v[0]; i < v[1]; i++) {
            const data = ethers.utils.randomBytes(i)
            const pointer = await addressFromWrite(sstore2.write(data, { gasLimit: 29000000 }))

            expect(await sstore2.read1(pointer)).to.equal(ethers.utils.hexlify(data))
            expect(await ethers.provider.getCode(pointer)).to.equal(ethers.utils.hexlify([0, ...data]))

            if (i > 1) {
              expect(await sstore2.read2(pointer, 1)).to.equal(ethers.utils.hexlify(data.slice(1)))
            }

            if (i > 2) {
              expect(await sstore2.read3(pointer, 1, i - 1)).to.equal(ethers.utils.hexlify(data.slice(1, i - 1)))
            }
          }
        }).timeout(5 * 60 * 1000)
      })
    })
  }
})
