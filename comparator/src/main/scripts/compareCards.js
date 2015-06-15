var process = require('process');
var fs = require('fs');
var _ = require('underscore');

var IndexCardComparator = require('./IndexCardComparator.js');
var IndexCardReader = require('./IndexCardReader.js');

function main(args)
{
	var modelFile = args[0];
	var fragment = args[1];
	var output = args[2];

	var reader = new IndexCardReader();
	var comparator = new IndexCardComparator();

	// read model data from the model input file
	// (in order to properly read an array of data we need "*" as pattern)
	reader.readCards(modelFile, "*", function (modelData)
	{
		comparator.loadModel(modelData);

		// if fragment input is a directory, process each file separately
		if (fs.lstatSync(fragment).isDirectory())
		{
			walk(fragment, function(err, files) {
				if (err)
				{
					throw err;
				}

				files = filterJson(files);
				processAllFiles(files, reader, comparator, output);
			});

		}
		// else assume that input fragment file contains an array of JSON object
		else
		{
			reader.readCards(fragment, "*", function (inferenceData)
			{
				var result = comparator.compareCards(inferenceData);

				// assuming output is a file
				if (output != null)
				{
					fs.writeFileSync(output, stringfyOutput(result));
				}
				else
				{
					// write to std out
					console.log(stringfyOutput(result));
				}
			});
		}
	});
}

/**
 * Recursive traversal of the target directory.
 * see http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
 *
 * @param dir   target dir
 * @param done  callback function
 */
function walk(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function(file) {
			file = dir + '/' + file;
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
}

function processAllFiles(files, reader, comparator, output)
{
	var filename = files.pop();

	// in order to read a single JSON object we need "null" pattern
	reader.readCards(filename, null, function (inferenceData)
	{
		var result = comparator.compareCards(inferenceData);

		// assuming output is a directory too
		if (output != null)
		{
			// TODO ignoring the output dir param for now, and writing the output into input dir
			//var outputFile = output + "/" + filename.substr(filename.lastIndexOf("/"));
			var outputFile = filename.substr(0, filename.lastIndexOf(".")) + "_mskcc.json";
			fs.writeFileSync(outputFile, stringfyOutput(result));
		}
		else
		{
			// write to std out
			console.log(stringfyOutput(result));
		}

		if (files.length > 0)
		{
			processAllFiles(files, reader, comparator, output);
		}
	});

}

function filterJson(files)
{
	var jsons = [];

	_.each(files, function(filename, idx) {
		if (filename.toLowerCase().indexOf(".json") != -1)
		{
			jsons.push(filename)
		}
	});

	return jsons;
}

function stringfyOutput(json)
{
	return JSON.stringify(json, null, 4);
}

// argv[0]: node -- argv[1]: compareCards.js
main(process.argv.slice(2));