# ISBX LoopBack CMS #

The ISBX LoopBack CMS is in its early stage of development. The Node JS CMS is design to work with LoopBack projects utilizing the built-in LoopBack Model Structure and generated REST APIs to perform create, read, update, and delete (CRUD) functions. The CMS user interface is built using Angular JS with Bootstrap and is highly customizable. The navigation of the CMS can be configured through JSON. You have the ability to create your own custom Angular Controllers and Views. Please see the [wiki](https://github.com/ISBX/isbx-loopback-cms/wiki) for installation and setup instructions. 

### Installing ###

This package is intended to be used as a Node Module. You should install the package with the command:

```
npm https://github.com/ISBX/isbx-loopback-cms.git
```

You can include it in your package.json using

```
{
  "isbx-loopback-cms": "git+https://github.com/ISBX/isbx-loopback-cms.git"
}
```

### Development ###

To contribute to the ISBX CMS Node Module you can fork the repo and then npm link it to your project:

```
git clone https://github.com/ISBX/isbx-loopback-cms.git [cms path]
cd [project path]
npm link [cms path]
```

for example:
```
git clone https://github.com/ISBX/isbx-loopback-cms.git /projects/nodejs/npm-isbx-loopback-cms
cd /projects/websites/my_cms
npm link /projects/nodejs/npm-isbx-loopback-cms
```

Now any changes made in the `npm-isbx-loopback-cms` source folder will be applied to your `my_cms` project.

### Note ###

When contributing to the ISBX CMS please create a feature branch and issue a pull request from your fork.
