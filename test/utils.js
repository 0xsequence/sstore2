
module.exports = {
  chunksFromRange: (length, chunkSize) => {
    const res = []

    for (let i = 0; i < length; i += chunkSize) {
      res.push([i, Math.min(i + chunkSize)])
    }

    return res
  }
}
