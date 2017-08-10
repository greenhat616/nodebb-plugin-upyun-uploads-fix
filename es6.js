"use strict";

const Package = require("./package.json");

const Upyun = require('upyun'), mime = require("mime"), uuid = require("uuid/v4"), fs = require("fs"), request = require("request"), path = require("path"), winston = module.parent.require("winston"), nconf = module.parent.require('nconf'), gm = require("gm"), im = gm.subClass({ imageMagick: true }), meta = module.parent.require("./meta"), db = module.parent.require("./database");

const plugin = {};

let upyunConn = null;

const settings = {
	"operaterName": process.env.UPYUN_OPERATER_NAME,
	"operaterPassword": process.env.UPYUN_OPERATER_PASSWORD,
	"endpoint": process.env.UPYUN_ENDPOINT || "v0.api.upyun.com",
	"bucket": process.env.UPYUN_UPLOADS_BUCKET || undefined,
	"path": process.env.UPYUN_UPLOADS_PATH || undefined,
	"host": process.env.UPYUN_HOST,
};

const fetchSettings = (callback) => {
	db.getObjectFields(Package.name, Object.keys(settings), (err, newSettings) => {
		if (err) {
			winston.error(err.message);
			if (typeof callback === "function") {
				callback(err);
			}
			return;
		}

		if (newSettings.operaterName) {
			settings.operaterName = newSettings.operaterName;
		} else {
			settings.operaterName = process.env.UPYUN_OPERATER_NAME;
		}

		if (newSettings.operaterPassword) {
			settings.operaterPassword = newSettings.operaterPassword;
		} else {
			settings.operaterPassword = process.env.UPYUN_OPERATER_PASSWORD;
		}

		if (!newSettings.bucket) {
			settings.bucket = process.env.UPYUN_UPLOADS_BUCKET || "";
		} else {
			settings.bucket = newSettings.bucket;
		}

		if (!newSettings.path) {
			settings.path = process.env.UPYUN_UPLOADS_PATH || "";
		} else {
			settings.path = newSettings.path;
		}

		if (!newSettings.host) {
			settings.host = process.env.UPYUN_HOST;
		} else {
			settings.host = newSettings.host;
		}

		if (!newSettings.endpoint) {
			settings.endpoint = process.env.UPYUN_ENDPOINT || "v0.api.upyun.com";
		} else {
			settings.endpoint = newSettings.endpoint;
		}

		if (settings.path) {
			UpyunConn().makeDir(getUpyunDir(), (err, result) => {
				if (err) {
					winston.error(err.message);
				}
				if (typeof callback === "function") {
					callback(err);
				}
			});
		} else if (typeof callback === "function") {
			callback();
		}
	});
};

const UpyunConn = () => {
	if (!upyunConn) {
		const bucket = new upyun.Bucket(settings.bucket, settings.operaterName, settings.operaterPassword);
		upyunConn = new upyun.Client(bucket, { domain: settings.endpoint });
	}

	return upyunConn;
};

function makeError(err) {
	if (err instanceof Error) {
		err.message = Package.name + " :: " + err.message;
	} else {
		err = new Error(Package.name + " :: " + err);
	}

	winston.error(err.message);
	return err;
}

plugin.activate = () => {
	fetchSettings();
};

plugin.deactivate = () => {
	upyunConn = null;
};

plugin.load = (params, callback) => {
	fetchSettings(err => {
		if (err) {
			return winston.error(err.message);
		}
		const adminRoute = "/admin/plugins/upyun-uploads";

		params.router.get(adminRoute, params.middleware.applyCSRF, params.middleware.admin.buildHeader, renderAdmin);
		params.router.get("/api" + adminRoute, params.middleware.applyCSRF, renderAdmin);

		params.router.post("/api" + adminRoute + "/upyunsettings", upyunSettings);
		params.router.post("/api" + adminRoute + "/credentials", credentials);

		callback();
	});
};

const renderAdmin = (req, res) => {
	// Regenerate csrf token
	const token = req.csrfToken();

	let forumPath = nconf.get('url');
	if (forumPath.split("").reverse()[0] !== "/") {
		forumPath = forumPath + "/";
	}
	const data = {
		bucket: settings.bucket,
		path: settings.path,
		host: settings.host,
		forumPath: forumPath,
		endpoint: settings.endpoint,
		operaterName: settings.operaterName,
		operaterPassword: settings.operaterPassword,
		csrf: token
	};

	res.render("admin/plugins/upyun-uploads", data);
}

const upyunSettings = (req, res, next) => {
	const data = req.body;
	const newSettings = {
		bucket: data.bucket || "",
		host: data.host || "",
		path: data.path || "",
		endpoint: data.endpoint || ""
	};

	saveSettings(newSettings, res, next);
}

const credentials = (req, res, next) => {
	const data = req.body;
	const newSettings = {
		operaterName: data.operaterName || "",
		operaterPassword: data.operaterPassword || ""
	};

	saveSettings(newSettings, res, next);
}

const saveSettings = (settings, res, next) => {
	db.setObject(Package.name, settings, err => {
		if (err) {
			return next(makeError(err));
		}

		fetchSettings();
		res.json("Saved!");
	});
}

plugin.uploadImage = (data, callback) => {
	const image = data.image;

	if (!image) {
		winston.error("invalid image");
		return callback(new Error("invalid image"));
	}

	//check filesize vs. settings
	if (image.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize);
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	const type = image.url ? "url" : "file";
	const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

	if (type === "file") {
		if (!image.path) {
			return callback(new Error("invalid image path"));
		}

		if (allowedMimeTypes.indexOf(mime.lookup(image.path)) === -1) {
			return callback(new Error("invalid mime type"));
		}

		fs.readFile(image.path, (err, buffer) => {
			uploadToUpyun(image.name, err, buffer, callback);
		});
	}
	else {   //River: what is this about? need test.
		if (allowedMimeTypes.indexOf(mime.lookup(image.url)) === -1) {
			return callback(new Error("invalid mime type"));
		}
		const filename = image.url.split("/").pop();

		const imageDimension = parseInt(meta.config.profileImageDimension, 10) || 128;

		// Resize image.
		im(request(image.url), filename)
			.resize(imageDimension + "^", imageDimension + "^")
			.stream((err, stdout, stderr) => {
				if (err) {
					return callback(makeError(err));
				}

				// This is sort of a hack - We"re going to stream the gm output to a buffer and then upload.
				// See https://github.com/aws/aws-sdk-js/issues/94
				let buf = new Buffer(0);
				stdout.on("data", d => {
					buf = Buffer.concat([buf, d]);
				});
				stdout.on("end", () => {
					uploadToUpyun(filename, null, buf, callback);
				});
			});
	}
};

plugin.uploadFile = (data, callback) => {
	const file = data.file;

	if (!file) {
		return callback(new Error("invalid file"));
	}

	if (!file.path) {
		return callback(new Error("invalid file path"));
	}

	//check filesize vs. settings
	if (file.size > parseInt(meta.config.maximumFileSize, 10) * 1024) {
		winston.error("error:file-too-big, " + meta.config.maximumFileSize);
		return callback(new Error("[[error:file-too-big, " + meta.config.maximumFileSize + "]]"));
	}

	fs.readFile(file.path, (err, buffer) => {
		uploadToUpyun(file.name, err, buffer, callback);
	});
};

const getUpyunDir = () => {
	let remotePath = '';
	if (settings.path && 0 < settings.path.length) {
		remotePath = settings.path;

		if (!remotePath.match(/^\//)) {
			// Add start slash
			remotePath = "/" + remotePath;
		}
		// remove trailing slash
		remotePath = remotePath.replace(/\/$/, '');

	}
	return remotePath;
}


const getUpyunHost = () => {
	let host = 'http://' + settings.bucket + '.b0.upaiyun.com';
	if (settings.host) {
		// must start with http://
		if (!settings.host.match(/^http/)) {
			host = 'http://' + settings.host;
		} else {
			host = settings.host;
		}
	}
	return host;
}

const uploadToUpyun = (filename, err, buffer, callback) => {
	if (err) {
		return callback(makeError(err));
	}

	let remotePath = getUpyunDir() + '/';

	remotePath += uuid() + path.extname(filename);

	UpyunConn().putFile(remotePath, buffer)
		.then((data) => {
			console.log(data);
			const host = getUpyunHost();
			const remoteHref = host + remotePath;
			callback(null, {
				name: filename,
				url: remoteHref
			});
		})
		.catch((err) => {
			return callback(makeError(err));
		});
}

const admin = plugin.admin = {};

admin.menu = (custom_header, callback) => {
	custom_header.plugins.push({
		"route": "/plugins/upyun-uploads",
		"icon": "fa-envelope-o",
		"name": "Upyun Uploads"
	});

	callback(null, custom_header);
};

module.exports = plugin;
