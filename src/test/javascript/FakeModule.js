define(function () {

    //simple constructor function that expects args to come in
    var Module =  function (args) {
        this.name = args && args.name;
        this.title = "a fake module";
    };

    return Module;

});
