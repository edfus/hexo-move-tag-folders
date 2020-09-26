'use strict';
const fs = require('fs');
const fsp = fs.promises;
const cheerio = require('cheerio');
// var postLinks = [];
// var indexLinks = [];

// hexo.extend.filter.register('after_post_render', function(data){
//   if(data.published && data.layout === 'post') 
//       postLinks.push(data.permalink.substring(data.permalink.length, data.permalink.lastIndexOf('.') + 4).concat('index.html')); 
//   // layout: false | post | more-intro
// })

hexo.extend.filter.register('before_exit', async function(){
  if(fs.existsSync(`public/${hexo.config.tag_dir}`)){
    if(!fs.existsSync(`public/${hexo.config.tag_dir}/--tagsFolderOperated--`)){
      fs.writeFileSync(`public/${hexo.config.tag_dir}/--tagsFolderOperated--`, '');
      try {
        const database = JSON.parse(await fsp.readFile(hexo.database.options.path)).models;
        let obj_categoriesInfo = {};

        database.Category.forEach(categoryObj => {
          obj_categoriesInfo[categoryObj._id] = {
            name: categoryObj.name,
            tags: []
          }
        });
        /* PostCategory
        * {
            post_id: 'ckfjd0uv20009gsvf6mw26aie',
            category_id: 'ckfjd0uv9000fgsvf1hqlb2wi',
            _id: 'ckfjd0uvi000ogsvf5qlg5777'
        * }
        * PostTag
        * {
            post_id: 'ckfjdg0ak005tt8vf4tqhgaja',
            tag_id: 'ckfjdg09t005lt8vfa1s235eh',
            _id: 'ckfjdg0av005yt8vfbdar29v2'-
        * }
        */
        database.PostCategory.forEach(post_category => {
            const tags = obj_categoriesInfo[post_category.category_id].tags;
            // reference type
            database.PostTag.forEach(post_oneTag => {
              if(post_category.post_id === post_oneTag.post_id)
                  tags.push({name: '',id: post_oneTag.tag_id});
            })
        });

        let arr_categoriesInfo = Object.keys(obj_categoriesInfo).map(e => obj_categoriesInfo[e]);

        arr_categoriesInfo.forEach(category => {
          category.tags.forEach(tag => {
            database.Tag.some(Tag => {
              if(Tag._id === tag.id){
                tag.name = Tag.name;
                return true;
              }
            })
          })
        });

        arr_categoriesInfo.forEach(category => {    
            category.tags = deteleRepeatedObject(category.tags);
        });

        return changeAnchorTagHref(arr_categoriesInfo)
                .then(() => 
                  Promise.all(arr_categoriesInfo.map(category => 
                    operateFolders(category)
                  ))
                )
      } catch (err) {
        console.error(err);
        return ;
      }
    }
  }
}, 11);

async function changeAnchorTagHref(arr_categoriesInfo){

  let obj_categoryOftags = {}; // { tagName(URI): itsCategory }

  arr_categoriesInfo.forEach(category => {
    category.tags.forEach(tag => {
      obj_categoryOftags[encodeURI(tag.name)] = encodeURI(category.name);
    })
  }) // may override

  return getFileRecursively('public/', modifyHTMLcontent);

  async function modifyHTMLcontent(path){
    if(!/(html?)$/.test(path))
      return;

    return fsp.readFile(path).then(data => {
      const $ = cheerio.load(data, {
        ignoreWhitespace: false,
        xmlMode: false,
        lowerCaseTags: false,
        decodeEntities: false
      });

      $('a[rel=tag]').each((i, e) => {
        const href = $(e).attr('href');
        let tempStr = '';
        if(href 
           && !/^(\s*(https?:)?\/\/)/.test(href)
           && /^((\/)?tags(\/))/.test(href)){
          
          // remove the trailing slash
          if(href.slice(href.length - 1, href.length) === '/')
            tempStr = href.substring(0, href.length - 1); 
          else if(/(\/index.html?)$/.test(href))
            tempStr = href.substring(0, href.lastIndexOf('/'));
          else return console.warn(`irregular href format: ${href}`);

          let tagName = tempStr.substring(tempStr.lastIndexOf('/') + 1, tempStr.length);

          if(!tagName.includes('%'))
            tagName = encodeURI(tagName);

          if(obj_categoryOftags[tagName]){
              $(e).attr('href', `/${hexo.config.category_dir}/${obj_categoryOftags[tagName]}/${tagName}/`);
          } else {
            console.warn(`${tagName} doesn't exist!`)
          }
        }else{
          if(!/^((\/)?categories(\/))/.test(href)) 
            console.info(`${href} skipped...`);
        }
      });

      // #addtional
      $('span[article-info=e23]>p').each(function(){
        $(this).html($(this).html().replace(/=e23=/g, ''));
        $(this).removeAttr('article-info');
      });
      $('div.article-cover').each(function(){
        const style = `radial-gradient(ellipse closest-side, #FDFBF99f, #FDFBF8) right no-repeat, url(${$(this).attr('article-cover')}) right no-repeat;`
        $(this).css("background", style);
        $(this).css("background-size",'cover');
      });
      // #addtional END

      return fsp.writeFile(path, $.html())
    })
  }
  // function indexPagesNum(path, num){
  //   if(fs.existsSync(`public${path}/page/${num}`))   
  //      return indexPagesNum(path, num + 1);
  //   else
  //      return num;
  // }
  // function removeFirstSlash(str) {
  //   return str.slice(1, str.length)
  // }

  // // tags
  // categoriesInfo.forEach(category => {
  //   pageLink.push(`${hexo.config.category_dir}/${category.name}/index.html`);
  //   category.tags.forEach(tag => {
  //     pageLink.push(`${hexo.config.tag_dir}/${tag.name}/index.html`);
  //   })
  // })

  // // index
  // let pageLink = ['index.html'];

  // for(let i = indexPagesNum('', 2) - 1; i > 1; i--){
  //   pageLink.push(`page/${i}/index.html`);
  // }

  // // more

  // pageLink.push(removeFirstSlash(`${hexo.config.more_path}/index.html`));

  // for(let j = indexPagesNum(hexo.config.more_path, 2) - 1; j > 1; j--){
  //   pageLink.push(removeFirstSlash(`${hexo.config.more_path}/page/${j}/index.html`));
  // }

  // var links = postLinks.concat(pageLink);
}

async function operateFolders(tagsOfThisCategory){
  if(!tagsOfThisCategory)
    return Promise.reject('!tagsOfThisCategory');
  // if(tagsOfThisCategory.name == hexo.config.category_display_by_archive)
  //   return '';
  if(tagsOfThisCategory.tags.length === 0)
    return ;

  let result = [];
  result.push(`${tagsOfThisCategory.name}'s tags operated:`);

  return Promise.all(tagsOfThisCategory.tags.map(async tag => {
    await copyDir(`public/${hexo.config.tag_dir}/${tag.name}/`, `public/${hexo.config.category_dir}/${tagsOfThisCategory.name}/${tag.name}/`);
    await delDir(`public/${hexo.config.tag_dir}/${tag.name}/`);
    result.push(`${tag.name}`);
  })).then(()=>console.info(result.join(" ")));
}

async function getFileRecursively(path, callback) { // param path must end with trailing slash
  return Promise.all(fs.readdirSync(path).map(async file => 
    (await fsp.stat(path + file)).isDirectory()
          ? getFileRecursively(path + file + "/", callback) 
          : callback(path + file)
  ))
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence

async function copyDir(source, target){
    if(!fs.existsSync(target)){
        fs.mkdirSync(target);
    }
    return getFileRecursively(source, sourcePath => 
      fsp.copyFile(sourcePath, target.concat(sourcePath.split(source)[1]))
    );
}

async function delDir(target){
  return getFileRecursively(target, file => 
    fsp.unlink(file)
  ).then(() => fsp.rmdir(target));
}

function deteleRepeatedObject(objArr) {
  let obj_tagUnique = {}, temp;
  return objArr.filter(
    currentObj => 
      !obj_tagUnique.hasOwnProperty(
        temp = Object.entries(currentObj)
        .sort(
          (entryA, entryB) => 
            Number(entryA[0]) - Number(entryB[0])
        )
        .reduce(
          (accumulator, currentEntry) =>
            accumulator += currentEntry[0] + JSON.stringify(currentEntry[1])
        )
      ) ?
        obj_tagUnique[temp] = true
        : false
  );
}