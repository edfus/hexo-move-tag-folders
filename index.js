'use strict';
const fs = require('hexo-fs');


hexo.extend.filter.register('before_exit', function(data){
  var moveTags = function (exists) {
    if(exists==false)
      return '';
    else
      categorysTagsAdd();
  };

  fs.exists(`public/${hexo.config.tag_dir}`, moveTags);
},11);

function categorysTagsAdd(){
  fs.readFile(hexo.database.options.path, [], function(err,data){  if(err)  console.log("读取文件fail " + err);  else {
    var result = JSON.parse(data);
    var categoriesInfo = [];

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
