'use strict';
const fs = require('hexo-fs');
var cheerio = require('cheerio');
var categoriesInfo = [];
var postLinks = [];
var indexLinks = [];

hexo.extend.filter.register('after_post_render', function(data){
if(data.published){
  if(data.layout === 'post')
    postLinks.push(data.permalink.substring(data.permalink.length, data.permalink.lastIndexOf('.')+4)+'index.html');
  else if(data.layout.indexOf('index') !== -1 )
    indexLinks.push(data.permalink.substring(data.permalink.length, data.permalink.lastIndexOf('.')+4)+'index.html');
}
})


hexo.extend.filter.register('before_exit', function(data){
  var moveTags = function (exists) {
    if(exists==false)
      return '';
    else{
      categorysTagsAdd();
   }
  };

  fs.exists(`public/${hexo.config.tag_dir}`, moveTags);
},11);

function indexPagesNum(path,num){
  var exist;
  (function(){  fs.exists(`public${path}/page/${num}`, function(exists){
    exist = exists;
  })})();

  if(!exist)
     return num-1;
  else
     return indexPagesNum(path,num+1);
}

function tagHrefChange(){
  var pageLink = [];

  categoriesInfo.forEach(function(category){
      pageLink.push(`${hexo.config.category_dir}/${category.name}/index.html`);
      category.tags.forEach(function(tag){
        pageLink.push(`${hexo.config.category_dir}/${category.name}/${tag.name}/index.html`);
        pageLink.push(`${hexo.config.tag_dir}/${tag.name}/index.html`);
      })
  })

  pageLink.push('index.html');

  for(var i = indexPagesNum('',2); i > 1; i-- ){
    pageLink.push(`public/page/${i}/index.html`);
  }

  pageLink.push(`${hexo.config.more_path}/index.html`);

  for(var i = indexPagesNum(hexo.config.more_path,2); i > 1; i-- ){
    pageLink.push(`public${hexo.config.more_path}/page/${i}/index.html`);
  }

  var links = postLinks.concat(indexLinks).concat(pageLink);

  links.forEach(function(link){
    fs.readFile('public/'+link, [], function(err,data){  if(err){  //console.log("读取文件fail " + err);
                                                                                                        return'';} else {
        var $ = cheerio.load(data, {
          ignoreWhitespace: false,
          xmlMode: false,
          lowerCaseTags: false,
          decodeEntities: false
        });

        $('a[rel=tag]').each(function(){
          if ($(this).attr('href')){
            if($(this).attr('href').substring($(this).attr('href').length, 1).substring($(this).attr('href').indexOf('/') -1, 0)=='tags'){
              var href = $(this).attr('href').substring($(this).attr('href').length -1, 0);
              let tagName = href.substring(href.length, href.lastIndexOf('/')+1);
              categoriesInfo.some(function(category){
                for(var i = 0; i < category.tags.length; i++ ){
                  // console.log(`${encodeURI(category.tags[i].name)} && ${tagName}`);
                  if(category.tags[i].name == tagName){
                    href = `/${hexo.config.category_dir}/${category.name}/${tagName}`;
                    return true;
                  }else if(encodeURI(category.tags[i].name) == tagName)
                  {
                    href = `/${hexo.config.category_dir}/${category.name}/${category.tags[i].name}`;
                    return true;
                  }
                }
              })
              if(href !== $(this).attr('href').substring($(this).attr('href').length -1, 0))
                  $(this).attr('href', `${href}`);
              else console.log(`irregular href format: ${href},${$(this).attr('href')},${tagName}`);
            }
          }else{
            console.info&&console.info("no href attr, skipped...");
            // console.info&&console.info($(this));
          }
        });
        data = $.html();
    fs.writeFile('public/'+link,data, [], function(err){  if(err)  console.log("写入文件fail " + err);  else ;})
    }})
  })
}

async function categorysTagsAdd(){
  await fs.readFile(hexo.database.options.path, [], function(err,data){  if(err)  console.log("读取文件fail " + err);  else {
    var result = JSON.parse(data);
      result.models.Category.forEach( function(Category){
        var category ={
          name: Category.name,
          id: Category._id,
          tags: []
        }
        categoriesInfo.push(category);
      });

      result.models.PostCategory.forEach( function(postandcategory){
          let tags;

          categoriesInfo.forEach(function(category){
            if(category.id==postandcategory.category_id){
                            tags = category.tags;
                            return '';
            }
          });

          result.models.PostTag.forEach(function(PostTag){
            if(postandcategory.post_id==PostTag.post_id)
                tags.push({name: '',id: PostTag.tag_id});
          })
      });

      categoriesInfo.forEach(function(category){
        category.tags.forEach(function(tag){
          result.models.Tag.forEach( function(Tag){
            if(tag.id==Tag._id){
              tag.name = Tag.name;
              return '';
            }
          })
        })
      });

      categoriesInfo.forEach(function(category){    
          category.tags = deteleRepeatedObject(category.tags);
          console.log(operateFolders(category));
      });
      tagHrefChange();
  }});
  
  
} //categoriesInfo: 一个category对象的数组，每个category对象包含其name、id、tag对象的数组,tag对象包含name和id

function deteleRepeatedObject(obj) {
    var uniques = [];
    var stringify = {};
    for (var i = 0; i < obj.length; i++) {
        var keys = Object.keys(obj[i]);
        keys.sort(function(a, b) {
            return (Number(a) - Number(b));
        });
        var str = '';
        for (var j = 0; j < keys.length; j++) {
            str += JSON.stringify(keys[j]);
            str += JSON.stringify(obj[i][keys[j]]);
        }
        if (!stringify.hasOwnProperty(str)) {
            uniques.push(obj[i]);
            stringify[str] = true;
        }
    }
    uniques = uniques;
    return uniques;
}

function operateFolders(tagsOfThisCategory){
  if(!tagsOfThisCategory)
    return console.log('!tagsOfThisCategory');
  // if(tagsOfThisCategory.name == hexo.config.category_display_by_archive)
  //   return '';
  if(tagsOfThisCategory.tags==[])
    return '';

  var result = [];
  result.push(`${tagsOfThisCategory.name}'s tags:`);

  tagsOfThisCategory.tags.forEach(function(tag){
    fs.copyDir(`public/${hexo.config.tag_dir}/${tag.name}`, `public/${hexo.config.category_dir}/${tagsOfThisCategory.name}/${tag.name}`, {},function(info){
        if( info == null)
          fs.rmdir(`public/${hexo.config.tag_dir}/${tag.name}`);      
    });
    result.push(`${tag.name}`);
  });
  return result.join(' ');
} //return console的信息(string
