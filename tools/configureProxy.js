const fs = require('fs');
const cp = require('child_process');
const { name, region } = require('../package.json');

console.log('configuring proxy');

console.log({ name, region });
// const LOCAL = process.env.NODE_ENV === 'development';

// console.log({ LOCAL });

// proxy_pass http://mm-monkapps2-us-east-1.s3.us-east-1.amazonaws.com;
//  proxy_pass http://mm-monkapps2-us-east-1.s3.us-east-1.amazonaws.com/adlingo-dog-webhook-dev$request_uri;

const confFileString = `
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${name}.${region}.dev.monkapps.com;

    # If you want to use a different web folder, please change it in the web
    # control panel on https://${region}.dev.monkapps.com Any changes made here will be overwritten
    root /var/projects/${name}/public;

    index index.php index.html index.htm;

    access_log  /var/projects/${name}/log/access.log  main;
    error_log /var/projects/${name}/log/error.log;

    error_page 401 /error-pages-4d656469614d6f6e6b73/401.html;
    error_page 403 /error-pages-4d656469614d6f6e6b73/403.html;
    error_page 404 /error-pages-4d656469614d6f6e6b73/404.html;
    error_page 502 /error-pages-4d656469614d6f6e6b73/502.html;
    error_page 503 /error-pages-4d656469614d6f6e6b73/503.html;
    error_page 504 /error-pages-4d656469614d6f6e6b73/504.html;

    add_header X-Content-Type-Options 'nosniff';
    add_header X-XSS-Protection '1; mode=block';
    add_header X-Frame-Options 'SAMEORIGIN';
    add_header Strict-Transport-Security max-age=63072000;
    add_header Referrer-Policy same-origin;

    # Passwords are automatically managed by the system, please leave these
    # lines as is. If you like to make a project publically accessible, please
    # use the \`disable-password\` command or the option in the management interface
    auth_basic "Restricted Access";
    auth_basic_user_file /var/projects/${name}/.config/htpasswd;

    # Want to make the project only available for MM offices? Uncomment the lines below
    #include allow-mm-ips.conf;
    #deny all;

    # Default location
    location / {
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $http_host;
    proxy_http_version 1.1;

    # to proxy WebSockets in nginx
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://unix:/var/projects/${name}/dev.sock:;
    proxy_pass_header Sec-Websocket-Extensions;
    }

    # Python project running with uwsgi?
    # Use this location instead of the one above
    #location / {
    #    include uwsgi_params;
    #    uwsgi_pass unix:/var/run/uwsgi/${name}.socket;
    #}

    # Serve /data from the S3 bucket
    location /data {
        include s3_proxy.conf;
        proxy_pass http://${getAwsRegion(region)}.amazonaws.com/${name}$request_uri;
    }

    # Handle .php files through php-fpm (fastcgi)
    location ~ \.php$ {
        try_files $uri =404;
        # This directive is managed by the system. Any changes made here will be overwritten
        fastcgi_pass unix:/var/run/php-fpm/${name}.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Special behaviour to always serve a robots.txt
    location = /robots.txt {
        access_log off;
        return 200 "User-agent: *\\nDisallow: /\\n";
    }

    # Special behaviour to fall back to a default favicon, if none is available in the webroot
    location = /favicon.ico {
        try_files $uri /error-pages-4d656469614d6f6e6b73/favicon.ico;
    }

    # Please leave this here, it serves requests for the error pages from s3
    location /error-pages-4d656469614d6f6e6b73/ {
        auth_basic off;
        allow all;
        include s3_proxy.conf;
        proxy_pass http://${getAwsRegion(region)}.amazonaws.com;
    }
}`;

// create the temp conf file
fs.writeFileSync('tmp/nginx.conf', confFileString);

// SCP the file to the remote server
try {
  const scpPath = `${name}@${region}.dev.monkapps.com:.config/nginx.conf`;
  console.log({ scpPath });
  //   cp.execSync(`scp tmp/nginx.conf ${scpPath}`);
} catch (err) {
  throw new Error(`SCP to remote server failed with error: ${err}`);
}

// remove the temp file
// try {
//   console.log('removing temp conf file');
//   fs.unlinkSync('tmp/nginx.conf');
// } catch (err) {
//   console.error(err);
// }

// ----- HELPER FUNCTIONS ------
function getAwsRegion(region) {
  switch (region) {
    case 'us':
      return 'mm-monkapps2-us-east-1.s3.us-east-1';
    case 'eu':
      return 'mm-monkapps2-eu-west-1.s3.eu-west-1';
    default:
      return 'mm-monkapps2-eu-west-1.s3.eu-west-1';
  }
}
