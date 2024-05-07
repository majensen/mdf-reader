export default [
  {
    input: 'src/MDFReader.js',
    output: [
      {
        file: 'dist/esm/mdf-reader.js',
        format: 'es'
      },
      {
        file: 'dist/node/mdf-reader.cjs',
        format: 'cjs'
      }
    ]
  }
]

