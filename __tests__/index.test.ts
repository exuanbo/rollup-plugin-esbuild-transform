import { promises as fs } from 'fs'
import { extname, join } from 'path'
import { RollupOptions, RollupOutput, rollup } from 'rollup'
import esbuild, { Options } from '../src'

const fooPath = join(__dirname, 'fixtures/Foo.tsx')
let fooContent: string

beforeAll(async () => {
  fooContent = await fs.readFile(fooPath, 'utf-8')
  await fs.writeFile(fooPath, fooContent.replace('./bar', join(__dirname, 'fixtures/bar')))
})

afterAll(async () => {
  await fs.writeFile(fooPath, fooContent)
})

const build = async (
  options?: Options | Options[],
  rollupOptions: RollupOptions = {}
): Promise<RollupOutput['output']> => {
  const build = await rollup({
    input: join(__dirname, 'fixtures/main.js'),
    ...rollupOptions,
    external: ['react', 'react-dom'],
    plugins: [
      esbuild(options),
      {
        name: 'css',
        transform(code, id) {
          if (extname(id) === '.css') {
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
  const { output } = await build.generate({ format: 'es' })
  return output
}

it('should transform', async () => {
  const output = await build([
    {
      loader: 'json'
    },
    {
      loader: 'tsx',
      banner: "import React from 'react'"
    },
    {
      loader: 'jsx'
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "import ReactDOM from 'react-dom';
    import React$1 from 'react';

    var style = \`.bar {
      display: flex;
    }
    \`;

    class Bar extends React$1.Component {
      render() {
        return /* @__PURE__ */ React$1.createElement(React$1.Fragment, null, /* @__PURE__ */ React$1.createElement(\\"style\\", null, style), /* @__PURE__ */ React$1.createElement(\\"div\\", {
          className: \\"bar\\"
        }, \\"bar\\"));
      }
    }

    var name = \\"rollup-plugin-esbuild-transform\\";

    class Foo extends React$1.Component {
      render() {
        return /* @__PURE__ */ React$1.createElement(\\"div\\", null, /* @__PURE__ */ React$1.createElement(Bar, null), /* @__PURE__ */ React$1.createElement(\\"div\\", {
          className: \\"name\\"
        }, name));
      }
    }

    ReactDOM.render(React.createElement(Foo, null), document.getElementById('root'));
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
      loader: 'tsx',
      banner: "import React from 'react'"
    },
    {
      loader: 'jsx'
    },
    {
      output: true,
      minify: true
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "import r from\\"react-dom\\";import e from\\"react\\";var l=\`.bar{display:flex}
    \`;class n extends e.Component{render(){return e.createElement(e.Fragment,null,e.createElement(\\"style\\",null,l),e.createElement(\\"div\\",{className:\\"bar\\"},\\"bar\\"))}}var a=\\"rollup-plugin-esbuild-transform\\";class m extends e.Component{render(){return e.createElement(\\"div\\",null,e.createElement(n,null),e.createElement(\\"div\\",{className:\\"name\\"},a))}}r.render(React.createElement(m,null),document.getElementById(\\"root\\"));
    "
  `)
})

it('should transform and add banner', async () => {
  const output = await build([
    {
      loader: 'json'
    },
    {
      loader: 'tsx',
      banner: "import React from 'react'"
    },
    {
      loader: 'jsx'
    },
    {
      include: /\.[jt]sx$/,
      banner: '/**\n * @license MIT\n */'
    }
  ])
  expect(output[0].code).toMatchInlineSnapshot(`
    "import ReactDOM from 'react-dom';
    import React$1 from 'react';

    var style = \`.bar {
      display: flex;
    }
    \`;

    /**
     * @license MIT
     */
    class Bar extends React$1.Component {
      render() {
        return /* @__PURE__ */ React$1.createElement(React$1.Fragment, null, /* @__PURE__ */ React$1.createElement(\\"style\\", null, style), /* @__PURE__ */ React$1.createElement(\\"div\\", {
          className: \\"bar\\"
        }, \\"bar\\"));
      }
    }

    var name = \\"rollup-plugin-esbuild-transform\\";

    /**
     * @license MIT
     */
    class Foo extends React.Component {
      render() {
        return /* @__PURE__ */ React.createElement(\\"div\\", null, /* @__PURE__ */ React.createElement(Bar, null), /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"name\\"
        }, name));
      }
    }

    ReactDOM.render(React.createElement(Foo, null), document.getElementById('root'));
    "
  `)
})

it('should throw error if id can not be resolve', async () => {
  expect.assertions(1)
  try {
    await build()
  } catch (err) {
    expect((err as Error).message).toMatchInlineSnapshot(
      '"Could not resolve \'./Foo\' from __tests__/fixtures/main.js"'
    )
  }
})

it('should warn', async () => {
  expect.assertions(1)
  await build(
    {
      format: 'esm'
    },
    {
      input: join(__dirname, 'fixtures/index.cjs'),
      onwarn(warning) {
        expect(warning.message).toMatch(
          '/rollup-plugin-esbuild-transform/__tests__/fixtures/index.cjs'
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
      input: join(__dirname, '../package.json'),
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
      input: join(__dirname, '../package.json'),
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
    "var _package = 'This is a JSON file.';

    export { _package as default };
    "
  `)
})
