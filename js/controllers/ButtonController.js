app.controller("buttonCtrl",function ($scope,DiagramService){

    $scope.Diagram = DiagramService.myDiagram;
    $scope.threshold = DiagramService.threshold;

    $scope.ZoomIn = function(){
        $scope.Diagram.commandHandler.increaseZoom();
    }
    $scope.SelectAll = function(){
        $scope.Diagram.commandHandler.selectAll();
    }
    $scope.Cut = function(){
        $scope.Diagram.commandHandler.cutSelection();
    }
    $scope.Copy = function(){
        $scope.Diagram.commandHandler.copySelection();
    }
    $scope.Paste = function(){
        $scope.Diagram.commandHandler.pasteSelection();
    }
    $scope.Delete = function(){
        $scope.Diagram.commandHandler.deleteSelection();
    }
    $scope.Group = function(){
        $scope.Diagram.commandHandler.groupSelection();
    }
    $scope.Ungroup = function(){
        $scope.Diagram.commandHandler.ungroupSelection() ;
    }
    $scope.Undo = function(){
        $scope.Diagram.commandHandler.undo();
    }
    $scope.Redo = function(){
        $scope.Diagram.commandHandler.redo();
    }
    $scope.ZoomtoFit = function(){
        $scope.Diagram.zoomToFit();
    }


})

