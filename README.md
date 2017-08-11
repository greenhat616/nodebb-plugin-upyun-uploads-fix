# NodeBB Upyun Uploads Plugin

`npm install nodebb-plugin-upyun-uploads-fix`

A plugin for NodeBB to take file uploads and store them on Upyun, uses the `filter:uploadImage` and `filter:uploadFile` hooks in NodeBB.


## Upyun Uploads Configuration


You can configure this plugin via a combination of the below, for instance, you can use **database** and **environment variables** in combination. You can also configure via the NodeBB Admin panel, which will result in the Bucket and Credentials being stored in the NodeBB Database.

If you decide to use the Database storage for Credentials, then they will take precedence over both Environment Variables and Instance Meta-data, the full load order is:

1. Database
2. Environment Variables

## DEMO

I use it on [V2MM.tech](https://v2mm.tech), but of course you can't see the admin panels.

### Environment Variables

```
export UPYUN_OPERATER_NAME="operatername"
export UPYUN_OPERATER_PASSWORD="password"
export UPYUN_UPLOADS_BUCKET="mybucket"
export UPYUN_UPLOADS_PATH="path"
export UPYUN_ENDPOINT="v0.api.upyun.com"
export UPYUN_HOST="hostname domain"
```

**NOTE:** Asset host is optional - If you do not specify an asset host, then the default asset host is `<bucket>.b0.upaiyun.com`.
**NOTE:** Asset path is optional - If you do not specify an asset path, then the default asset path is `/`.

### Database Backed Variables

From the NodeBB Admin panel, you can configure the following settings to be stored in the Database:

* `bucket` — The bucket to upload into
* `host` - The base URL for the asset.  **Typically http://\<bucket\>.b0.upaiyun.com**
* `path` - The asset path (optional)
* `endpoint` - The endpoint. **Typically v0.api.upyun.com**
* `operaterName` — The Upyun Operater Name
* `operaterPassword` — The Upyun Operater Password

**NOTE: Storing your credentials in the database is bad practice, and you really shouldn't do it.**

Highly recommend using **Environment Variables** instead.

## Caveats

* Currently all uploads are stored in Upyun keyed by a UUID and file extension, as such, if a user uploads multiple avatars, all versions will still exist in Upyun. This is a known issue and may require some sort of cron job to scan for old uploads that are no longer referenced in order for those objects to be deleted from Upyun.

## Credit

This plugin is a folk from [LouiseMcMahon's nodebb-plugin-s3-uploads](https://github.com/LouiseMcMahon/nodebb-plugin-s3-uploads). Thanks for her great job.
