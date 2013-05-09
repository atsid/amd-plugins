define(function () {

    //simple constructor function that expects args to come in
    var Module =  function (args) {
        this.name = args && (args.name.name || args.name);
        this.title = (args && args.title) || "a fake module";
    };

    return Module;

});
