import path from 'path'
import { RollupOptions, RollupOutput, rollup } from 'rollup'
import esbuild, { Options } from '../src'

const INDEX_JS_PATH = path.join(__dirname, 'fixtures/index.js')

const build = async (
  options: Options | Options[],
  rollupOptions: RollupOptions = {}
): Promise<RollupOutput['output']> => {
  const build = await rollup({
    input: INDEX_JS_PATH,
    ...rollupOptions,
    plugins: [
      esbuild(options),
      {
        name: 'css',
        transform(code, id) {
          if (path.extname(id) === '.css') {
            return {
              code: `export default \`${code}\``
            }
          }
          return null
        }
      },
      ...(rollupOptions.plugins ?? [])
    ]
  })
  const { output } = await build.generate({ format: 'esm' })
  return output
}

it('should transform', async () => {
  const output = await build([
    {
      loader: 'json'
    },
    {
      loader: 'tsx'
    },
    {
      loader: 'jsx',
      include: /\.jsx?$/
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "var style = \`.qux {
      display: flex;
    }
    \`;

    var qux = true;

    class Bar {
      render() {
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(\\"style\\", null, style), /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"qux\\"
        }, qux));
      }
    }

    class Foo {
      render() {
        return /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"bar\\"
        }, /* @__PURE__ */ React.createElement(Bar, null));
      }
    }

    console.log(/* @__PURE__ */ React.createElement(Foo, null));
    "
  `)
})

it('should transform and minify', async () => {
  const output = await build([
    {
      loader: 'json'
    },
    {
      loader: 'css',
      minify: true
    },
    {
      loader: 'tsx'
    },
    {
      loader: 'jsx',
      include: /\.[jt]s(?:x|on)?$/,
      minify: true
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "var e$1 = \`.qux{display:flex}
    \`;

    var e=!0;

    class s{render(){return React.createElement(React.Fragment,null,React.createElement(\\"style\\",null,e$1),React.createElement(\\"div\\",{className:\\"qux\\"},e))}}

    class a{render(){return React.createElement(\\"div\\",{className:\\"bar\\"},React.createElement(s,null))}}

    console.log(React.createElement(a,null));
    "
  `)
})

it('should transform and add banner', async () => {
  const output = await build([
    {
      loader: 'json'
    },
    {
      loader: 'tsx'
    },
    {
      loader: 'jsx',
      include: /\.jsx?$/
    },
    {
      loader: 'js',
      include: /\.[jt]sx$/,
      banner: '/**\n * @license MIT\n */'
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "var style = \`.qux {
      display: flex;
    }
    \`;

    var qux = true;

    /**
     * @license MIT
     */
    class Bar {
      render() {
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(\\"style\\", null, style), /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"qux\\"
        }, qux));
      }
    }

    /**
     * @license MIT
     */
    class Foo {
      render() {
        return /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"bar\\"
        }, /* @__PURE__ */ React.createElement(Bar, null));
      }
    }

    console.log(/* @__PURE__ */ React.createElement(Foo, null));
    "
  `)
})

it('should throw error if id can not be resolve', async () => {
  expect.assertions(1)
  try {
    await build({
      loader: 'jsx',
      include: /\.jsx?$/
    })
  } catch (err) {
    expect(err.message).toBe("Could not resolve './Foo' from __tests__/fixtures/index.js")
  }
})

it('should warn', async () => {
  expect.assertions(1)
  await build(
    {
      loader: 'js',
      format: 'esm'
    },
    {
      input: path.join(__dirname, 'fixtures/cjs.js'),
      onwarn(warning) {
        expect(warning.message).toMatch(
          '/rollup-plugin-esbuild-transform/__tests__/fixtures/cjs.js'
        )
      }
    }
  )
})

it('should not generate sourcemap if option is set', async () => {
  const output = await build(
    {
      loader: 'json',
      sourcemap: false
    },
    {
      input: path.join(__dirname, 'fixtures/baz.json'),
      output: {
        sourcemap: true
      }
    }
  )
  expect(output[0].map).toBe(null)
})

it('should not transform exclude is set', async () => {
  const output = await build(
    {
      loader: 'json',
      exclude: /\.json$/
    },
    {
      input: path.join(__dirname, 'fixtures/baz.json'),
      plugins: [
        {
          name: 'json',
          transform() {
            return {
              code: "export default 'This is a JSON file.'",
              map: { mappings: '' }
            }
          }
        }
      ]
    }
  )
  expect(output[0].code).toMatchInlineSnapshot(`
    "var baz = 'This is a JSON file.';

    export { baz as default };
    "
  `)
})
