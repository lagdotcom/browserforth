module.exports = {
	entry: './src/main',
	plugins: [],
	output: {
		path: __dirname + '/dist',
		filename: 'main.js',
	},
	devtool: 'eval-source-map',
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.(png|wav)$/,
				loader: 'file-loader',
				options: { name: '[name].[ext]' },
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{ test: /\.tsx?$/, loader: 'ts-loader' },
		],
	},
};
