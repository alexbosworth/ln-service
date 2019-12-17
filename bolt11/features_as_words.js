// 80 -> 7: true (really 80 -> 9 on the 5 bit shift)

const setBits = [2, 3, 8];
const bitsPerByte = 8;

const maxBit = Math.max(...setBits);
const length = Math.floor(maxBit / bitsPerByte) + 1;
const buffer = Buffer.alloc(length, 0);

for (const bitIndex of setBits) {
  const byteIndex = length - Math.floor(bitIndex / bitsPerByte) - 1;
  const maskIndex = bitIndex % bitsPerByte;
  const mask = 1 << maskIndex;
  buffer[byteIndex] |= mask;
}

const lengthBytes = Buffer.alloc(2);
lengthBytes.writeUInt16BE(length);

console.log("BUFFER", Buffer.concat([lengthBytes, buffer]));


//
// const bitmap = getBitmap(data); // {"5":true,"6":true,"10":true,"13":true}


// const bits = [4, 5, 16];
// const bitsPerByte = 8;
//
// const maxBit = Math.max(...bits);
//
// const dataLength = Math.floor(maxBit / bitsPerByte) + 1;
//
// const data = Buffer.alloc(dataLength);
//
// bits.forEach(bitIndex => {
//   const byteIndex = dataLength - Math.floor(bitIndex / bitsPerByte) - 1;
//   const maskIndex = bitIndex % bitsPerByte;
//
//   const mask = 1 << maskIndex;
//
//   data[byteIndex] |= mask;
// });
//
// console.log("BUFFER", data);
