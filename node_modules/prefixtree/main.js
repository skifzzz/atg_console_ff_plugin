/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var builder = require("./PrefixTreeBuilder");

var tree = builder.create(3, ['test','this','fucking','thing', 'testing', 'another_test']);

console.log(tree.find('test'));
console.log(tree.find('t'));
console.log(tree.find('te'));
console.log(tree.find('ting'));

