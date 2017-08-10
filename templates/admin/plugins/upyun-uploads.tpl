<h1><i class="fa fa-picture-o"></i> Upyun Uploads Configuration</h1>
<hr/>
<b>Fix 版本解决了Upyun配置错误就崩溃的问题，所以我没不再推荐export方法，更建议下面的使用数据库配置的方法。(虽然export效率高，但重启就没了，你又得重新写)</b>
<p>You can configure this plugin via a combination of the below, for instance, you can use <em>database</em>
	and <em>environment variables</em> in combination. You can also specify values in the form below, and those will be
	stored in the database.</p>

<h3>Environment Variables</h3>
<pre><code>export UPYUN_OPERATER_NAME="operatername"
export UPYUN_OPERATER_PASSWORD="password"
export UPYUN_UPLOADS_BUCKET="mybucket"
export UPYUN_UPLOADS_PATH="path"
export UPYUN_ENDPOINT="v0.api.upyun.com"
export UPYUN_HOST="hostname domain"
</code></pre>

<p>
	Upyun endpoint, path and host are optional. You can leave these blank to default to the standard asset url -
	http://mybucket.b0.upaiyun.com/uuid.jpg, and standard endpoint - v0.api.upyun.com<br/>
	Upyun host can be set to a custom asset host. For example, if set to cdn.mywebsite.com then the asset url is
	http://cdn.mywebsite.com/uuid.jpg.<br/>
	Upyun path can be set to a custom asset path. For example, if set to /assets, then the asset url is
	http://mybucket.b0.upaiyun.com/assets/uuid.jpg.<br/>
	If both are asset host and path are set, then the url will be http://cdn.mywebsite.com/assets/uuid.jpg.
</p>

<div class="alert alert-warning">
	<p>If you need help, create an <a href="https://github.com/revir/nodebb-plugin-upyun-uploads/issues/">issue on
		Github</a>.</p>
</div>

<h3>Database Stored configuration:</h3>
<form id="upyun-upload-bucket">
	<label for="upyunbucket">Bucket</label><br/>
	<input type="text" id="upyunbucket" name="bucket" value="{bucket}" title="Upyun Bucket" class="form-control input-lg"
	       placeholder="Upyun Bucket"><br/>

	<label for="upyunhost">Host</label><br/>
	<input type="text" id="upyunhost" name="host" value="{host}" title="Upyun Host" class="form-control input-lg"
	       placeholder="website.com"><br/>

	<label for="upyunpath">Path</label><br/>
	<input type="text" id="upyunpath" name="path" value="{path}" title="Upyun Path" class="form-control input-lg"
	       placeholder="/assets"><br/>

	<label for="upyun-endpoint">Endpoint</label><br/>
	<select id="upyun-endpoint" name="endpoint" title="Upyun Endpoint" class="form-control">
		<option value="">..</option>
		<option value="v0.api.upyun.com">自动选择合适的线路 (v0.api.upyun.com)</option>
		<option value="v1.api.upyun.com">电信线路 (v1.api.upyun.com)</option>
		<option value="v2.api.upyun.com">联通（网通）线路 (v2.api.upyun.com)</option>
		<option value="v3.api.upyun.com">移动（铁通）线路 (v3.api.upyun.com)</option>
	</select>
	<br/>

	<button class="btn btn-primary" type="submit">Save</button>
</form>

<br><br>
<form id="upyun-upload-credentials">
	<label for="bucket">Credentials</label><br/>
	<div class="alert alert-warning">
		Configuring this plugin using the fields below is <strong>NOT recommended</strong>, as it can be a potential
		security issue. We highly recommend that you investigate using <strong>Environment Variables</strong>
	</div>
	<input type="text" name="operaterName" value="{operaterName}" maxlength="20" title="Operater Name"
	       class="form-control input-lg" placeholder="Operater Name"><br/>
	<input type="password" name="operaterPassword" value="{operaterPassword}" title="Operater Password"
	       class="form-control input-lg" placeholder=""><br/>
	<button class="btn btn-primary" type="submit">Save</button>
</form>

<script>
	$(document).ready(function () {

		$('#upyun-endpoint option[value="{endpoint}"]').prop('selected', true);

		$("#upyun-upload-bucket").on("submit", function (e) {
			e.preventDefault();
			save("upyunsettings", this);
		});

		$("#upyun-upload-credentials").on("submit", function (e) {
			e.preventDefault();
			var form = this;
			bootbox.confirm("Are you sure you wish to store your credentials for Upyun in the database?", function (confirm) {
				if (confirm) {
					save("credentials", form);
				}
			});
		});

		function save(type, form) {
			var data = {
				_csrf: '{csrf}' || $('#csrf_token').val()
			};

			var values = $(form).serializeArray();
			for (var i = 0, l = values.length; i < l; i++) {
				data[values[i].name] = values[i].value;
			}

			$.post('{forumPath}api/admin/plugins/upyun-uploads/' + type, data).done(function (response) {
				if (response) {
					ajaxify.refresh();
					app.alertSuccess(response);
				}
			}).fail(function (jqXHR, textStatus, errorThrown) {
				ajaxify.refresh();
				app.alertError(jqXHR.responseJSON ? jqXHR.responseJSON.error : 'Error saving!');
			});
		}
	});
</script>
