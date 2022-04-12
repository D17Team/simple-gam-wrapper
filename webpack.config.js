const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const autoprefixer = require('autoprefixer');

module.exports = {
  mode: 'production',
  entry: {
    sgwAuto: './src/autoWrapper.js',
		sgw: './src/gamWrapper.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './/dist')
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: 'babel-loader'
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: path.resolve(
                __dirname,
                './dist/'
              )
            }
          },
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
							postcssOptions: {
								plugins: () => [autoprefixer]
							}
            }
          },
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].bundle.css'
    })
  ]
};