import { promises as fs } from 'fs'
import { extname, join } from 'path'
import { Plugin, RollupOptions, RollupOutput, rollup } from 'rollup'
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

const css = (): Plugin => {
  return {
    name: 'css',
    transform(code, id) {
      if (extname(id) === '.css') {
        return {
          code: `export default \`${code}\``
        }
      }
      return null
    }
  }
}

const bundle = async (
  options?: Options | Options[],
  rollupOptions: RollupOptions = {}
): Promise<RollupOutput['output']> => {
  const build = await rollup({
    input: join(__dirname, 'fixtures/main.js'),
    ...rollupOptions,
    external: ['react', 'react-dom'],
    plugins: [...(rollupOptions.plugins ?? []), esbuild(options), css()]
  })
  const { output } = await build.generate({ format: 'es' })
  return output
}

it('should transform', async () => {
  const output = await bundle([
    {
      loader: 'json'
    },
    {
      loader: 'tsx',
      banner: "import React from 'react'"
    },
    {
      loader: 'ts'
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

    const toUpperCase = (str) => str.toUpperCase();

    var name = \\"rollup-plugin-esbuild-transform\\";

    class Foo extends React$1.Component {
      constructor() {
        super(...arguments);
        this.displayName = \\"Foo\\";
      }
      render() {
        return /* @__PURE__ */ React$1.createElement(\\"div\\", null, /* @__PURE__ */ React$1.createElement(Bar, null), /* @__PURE__ */ React$1.createElement(\\"div\\", {
          className: \\"name\\"
        }, toUpperCase(name)));
      }
    }

    ReactDOM.render(React.createElement(Foo, null), document.getElementById('root'));
    "
  `)
})

it('should transform and minify', async () => {
  const output = await bundle([
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
      loader: 'ts'
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
    "import r from\\"react-dom\\";import e from\\"react\\";var n=\`.bar{display:flex}
    \`;class a extends e.Component{render(){return e.createElement(e.Fragment,null,e.createElement(\\"style\\",null,n),e.createElement(\\"div\\",{className:\\"bar\\"},\\"bar\\"))}}const l=t=>t.toUpperCase();var m=\\"rollup-plugin-esbuild-transform\\";class s extends e.Component{constructor(){super(...arguments),this.displayName=\\"Foo\\"}render(){return e.createElement(\\"div\\",null,e.createElement(a,null),e.createElement(\\"div\\",{className:\\"name\\"},l(m)))}}r.render(React.createElement(s,null),document.getElementById(\\"root\\"));
    "
  `)
})

it('should transform using tsconfig', async () => {
  const output = await bundle([
    {
      loader: 'json'
    },
    {
      loader: 'tsx',
      banner: "import React from 'react'",
      tsconfig: join(__dirname, 'fixtures/tsconfig.json')
    },
    {
      loader: 'ts'
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

    const toUpperCase = (str) => str.toUpperCase();

    var name = \\"rollup-plugin-esbuild-transform\\";

    class Foo extends React$1.Component {
      displayName = \\"Foo\\";
      render() {
        return /* @__PURE__ */ React$1.createElement(\\"div\\", null, /* @__PURE__ */ React$1.createElement(Bar, null), /* @__PURE__ */ React$1.createElement(\\"div\\", {
          className: \\"name\\"
        }, toUpperCase(name)));
      }
    }

    ReactDOM.render(React.createElement(Foo, null), document.getElementById('root'));
    "
  `)
})

it('should transform and add banner', async () => {
  const output = await bundle([
    {
      loader: 'json'
    },
    {
      loader: 'tsx',
      banner: "import React from 'react'"
    },
    {
      loader: 'ts'
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

    const toUpperCase = (str) => str.toUpperCase();

    var name = \\"rollup-plugin-esbuild-transform\\";

    /**
     * @license MIT
     */
    class Foo extends React.Component {
      constructor() {
        super(...arguments);
        this.displayName = \\"Foo\\";
      }
      render() {
        return /* @__PURE__ */ React.createElement(\\"div\\", null, /* @__PURE__ */ React.createElement(Bar, null), /* @__PURE__ */ React.createElement(\\"div\\", {
          className: \\"name\\"
        }, toUpperCase(name)));
      }
    }

    ReactDOM.render(React.createElement(Foo, null), document.getElementById('root'));
    "
  `)
})

it('should throw error if id can not be resolve', async () => {
  expect.assertions(1)
  try {
    await bundle()
  } catch (error) {
    if (error instanceof Error) {
      expect(error.message).toMatchInlineSnapshot(
        '"Could not resolve \'./Foo\' from __tests__/fixtures/main.js"'
      )
    }
  }
})

it('should warn', async () => {
  expect.assertions(1)
  await bundle(
    {
      loader: 'default',
      format: 'esm'
    },
    {
      input: join(__dirname, 'fixtures/require.cjs'),
      onwarn(warning) {
        expect(warning.message).toMatch('Converting "require" to "esm" is currently not supported')
      }
    }
  )
})

it('should not generate sourcemap if option is set', async () => {
  const output = await bundle(
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

it('should match nothing if loader has no default extension', async () => {
  expect.assertions(1)
  try {
    await bundle(
      {
        loader: 'dataurl'
      },
      {
        input: join(__dirname, 'fixtures/image.mjs')
      }
    )
  } catch (error) {
    if (error instanceof Error) {
      expect(error.message).toMatchInlineSnapshot(
        '"Unexpected character \'�\' (Note that you need plugins to import files that are not JavaScript)"'
      )
    }
  }
})

const jsonFallback = (): Plugin => {
  return {
    name: 'json',
    transform() {
      return {
        code: "export default 'This is a JSON file.'",
        map: { mappings: '' }
      }
    }
  }
}

it('should not transform if exclude is set', async () => {
  const output = await bundle(
    {
      loader: 'json',
      exclude: /\.json$/
    },
    {
      input: join(__dirname, '../package.json'),
      plugins: [jsonFallback()]
    }
  )
  expect(output[0].code).toMatchInlineSnapshot(`
    "var _package = 'This is a JSON file.';

    export { _package as default };
    "
  `)
})
