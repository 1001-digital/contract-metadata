import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)

const contractSchema = JSON.parse(readFileSync('schema/contract-metadata.schema.json', 'utf8'))
const interfaceSchema = JSON.parse(readFileSync('schema/interface.schema.json', 'utf8'))

ajv.addSchema(contractSchema, 'contract-metadata.schema.json')
const validateContract = ajv.compile(contractSchema)
const validateInterface = ajv.compile(interfaceSchema)

const args = process.argv.slice(2)
const runContracts = args.length === 0 || args.includes('--contracts')
const runInterfaces = args.length === 0 || args.includes('--interfaces')

let hasErrors = false

if (runContracts) {
  const contractDir = 'contracts'
  const files = readdirSync(contractDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const path = join(contractDir, file)
    const data = JSON.parse(readFileSync(path, 'utf8'))
    const valid = validateContract(data)

    if (valid) {
      console.log(`  \x1b[32m✓\x1b[0m ${path}`)
    } else {
      hasErrors = true
      console.log(`  \x1b[31m✗\x1b[0m ${path}`)
      for (const err of validateContract.errors) {
        console.log(`    ${err.instancePath || '/'} ${err.message}`)
      }
    }

    // Additional semantic checks
    const warnings = semanticChecks(data, path)
    for (const w of warnings) {
      console.log(`    \x1b[33m⚠\x1b[0m ${w}`)
    }
  }
}

if (runInterfaces) {
  const interfaceDir = 'interfaces'
  const files = readdirSync(interfaceDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const path = join(interfaceDir, file)
    const data = JSON.parse(readFileSync(path, 'utf8'))
    const valid = validateInterface(data)

    if (valid) {
      console.log(`  \x1b[32m✓\x1b[0m ${path}`)
    } else {
      hasErrors = true
      console.log(`  \x1b[31m✗\x1b[0m ${path}`)
      for (const err of validateInterface.errors) {
        console.log(`    ${err.instancePath || '/'} ${err.message}`)
      }
    }
  }
}

if (hasErrors) {
  console.log('\n\x1b[31mValidation failed.\x1b[0m')
  process.exit(1)
} else {
  console.log('\n\x1b[32mAll files valid.\x1b[0m')
}

function semanticChecks(data, path) {
  const warnings = []
  const groups = data.groups ? Object.keys(data.groups) : []

  // Check function group references
  if (data.functions) {
    for (const [name, fn] of Object.entries(data.functions)) {
      if (fn.group && groups.length > 0 && !groups.includes(fn.group)) {
        warnings.push(`functions.${name}.group "${fn.group}" not found in groups`)
      }
      // Check related references
      if (fn.related) {
        for (const ref of fn.related) {
          if (!data.functions[ref]) {
            warnings.push(`functions.${name}.related references unknown function "${ref}"`)
          }
        }
      }
    }
  }

  // Check address matches filename
  if (data.address) {
    const expected = basename(path, '.json')
    if (data.address !== expected) {
      warnings.push(`address "${data.address}" does not match filename "${expected}"`)
    }
  }

  return warnings
}
