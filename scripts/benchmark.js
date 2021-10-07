
const { ethers } = require('ethers')
const hre = require('hardhat')

async function addressFromWrite (tx) {
  const log = (await tx).logs[0]
  return ethers.utils.defaultAbiCoder.decode(['address'], log.data)[0]
}

async function costFromTx (tx) {
  const log = (await tx).logs[(await tx).logs.length - 1]
  return ethers.utils.defaultAbiCoder.decode(['uint256'], log.data)[0].toNumber()
}

async function main () {
  const Benchmark = await hre.ethers.getContractFactory('Benchmark')

  const data = ethers.utils.randomBytes(20000)

  const createCsvWriter = require('csv-writer').createObjectCsvWriter
  const csvWriter = createCsvWriter({
    path: './cost.csv',
    header: [
      { id: 'size', title: 'SIZE' },
      { id: 'w1', title: 'W1' },
      { id: 'w2', title: 'W2' },
      { id: 'w3', title: 'W3' },
      { id: 'r1', title: 'R1' },
      { id: 'r2', title: 'R2' },
      { id: 'r3', title: 'R3' }
    ]
  })

  const samples = [0, 2, 32, 33, 64, 96, 128, 256, 512, 1024, 1024 * 24]
  for (const k in samples) {
    const bench = await Benchmark.deploy()
    await bench.deployed()

    const i = samples[k]

    const slice = data.slice(0, i)
    const key = ethers.utils.randomBytes(32)

    const w1 = await (await bench.write1(key, slice, { gasLimit: 30000000 })).wait()
    const w2 = await (await bench.write2(key, slice, { gasLimit: 30000000 })).wait()
    const w3 = await (await bench.write3(slice, { gasLimit: 30000000 })).wait()

    const addr = await addressFromWrite(w3)

    const r1 = await (await bench.read1(key)).wait()
    const r2 = await (await bench.read2(key)).wait()
    const r3 = await (await bench.read3(addr)).wait()

    console.log('size:', i, 'native write:', await costFromTx(w1), 'sstore2 write:', await costFromTx(w3), 'sstore2-map write:', await costFromTx(w2))
    console.log('size:', i, 'native read:', await costFromTx(r1), 'sstore2 read:', await costFromTx(r3), 'sstore2-map read:', await costFromTx(r2))
    console.log()

    await csvWriter.writeRecords([{
      size: i,
      r1: await costFromTx(r1),
      r2: await costFromTx(r2),
      r3: await costFromTx(r3),
      w1: await costFromTx(w1),
      w2: await costFromTx(w2),
      w3: await costFromTx(w3)
    }])
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
