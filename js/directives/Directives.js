app.directive("zoomout",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
          scope.ZoomOut=function(){

             DiagramService.getDiagram().commandHandler.decreaseZoom();


          }
        },
        template:
            '<div  class="btn btn-primary" ng-click="ZoomOut()">Zoom Out</div>'

    }
})
app.directive("zoomin",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.ZoomIn=function(){
                DiagramService.getDiagram().commandHandler.increaseZoom();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="ZoomIn()">Zoom In</div>'
    }
})
app.directive("cut",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Cut=function(){
                DiagramService.getDiagram().commandHandler.cutSelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Cut()">Cut</div>'
    }
})
app.directive("copy",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Copy=function(){
                DiagramService.getDiagram().commandHandler.copySelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Copy()">Copy</div>'
    }
})
app.directive("paste",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Paste=function(){
                DiagramService.getDiagram().commandHandler.pasteSelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Paste()">Paste</div>'
    }
})
app.directive("delete",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Delete=function(){
                DiagramService.getDiagram().commandHandler.deleteSelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Delete()">Delete</div>'
    }
})
app.directive("group",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Group=function(){
                DiagramService.getDiagram().commandHandler.groupSelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Group()">Group</div>'
    }
})
app.directive("ungroup",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Ungroup=function(){
                DiagramService.getDiagram().commandHandler.ungroupSelection();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Ungroup()">Ungroup</div>'
    }
})
app.directive("undo",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Undo=function(){
                DiagramService.getDiagram().commandHandler.undo();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Undo()">Undo</div>'
    }
})
app.directive("redo",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.Redo=function(){
                DiagramService.getDiagram().commandHandler.redo();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="Redo()">Redo</div>'
    }
})
app.directive("zoomtofit",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.ZoomtoFit=function(){
                DiagramService.getDiagram().commandHandler.zoomToFit();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="ZoomtoFit()">Zoom to Fit</div>'
    }
})
app.directive("selectall",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.SelectAll=function(){
                DiagramService.getDiagram().commandHandler.selectAll();
            }
        },
        template:
            '<div  class="btn btn-primary" ng-click="SelectAll()">SelectAll</div>'
    }
})

app.directive("zippy",function(DiagramService){
    return {
        restrict: "E",
        link: function(scope){
            scope.isContentVisible = false;
            scope.toggleContent = function(){
                scope.isContentVisible=!scope.isContentVisible;
            }
            scope.refreshPalette =function(){
            	scope.searchText="";
            	DiagramService.LoadPalette();
            }
        }

    }
})
app.directive("search",function(DiagramService){
    return{
        restrict: "E",
        link: function(scope){
            scope.search = function($event){

                myDiagram = DiagramService.getDiagram();
                myPalette = DiagramService.getPalette()
                myDiagram.startTransaction("Add State");
                searchtext=scope.searchText;

                len=0;
                indicator=0;

//                searchtext = document.getElementById("searchtext").value;
//                if (searchtext==="")
//                {
//                    searchtext= document.getElementById("infobar").value;
//
//
//                }
                //init
                myPalette.model= new go.GraphLinksModel();

                minInd=50;
                minIdx=-1;

                NodeArray = DiagramService.getNodeArray();
                if (searchtext.trim()!="")
                {
                    for ( i=0; i<=NodeArray.length-1;i++)
                    {

                        indicator =(NodeArray[i].text.toLowerCase()).indexOf(searchtext.toLowerCase());

                        if (indicator>=0)
                        {
                            if (indicator<=minInd)
                            {
                                minInd=indicator;
                                minIdx=i;
                            }
                            myPalette.model.addNodeData(NodeArray[i]);

                        }
                        else{
                        	indicator =(NodeArray[i].des.toLowerCase()).indexOf(searchtext.toLowerCase());
                        	if (indicator>=0)
                        	{
                            	if (indicator<=minInd)
                            	{
                                	minInd=indicator;
                                	minIdx=i;
                            	}
                            	myPalette.model.addNodeData(NodeArray[i]);

                        	}
                        }
                    }
                }
                else
                {
                    for ( i=0; i<=NodeArray.length-1;i++)
                    {
                        myPalette.model.addNodeData(NodeArray[i]);

                    }
                }

                if (event.keyCode==13 )
                {


                    if (minInd>=0 && minIdx >=0)
                    {
                        nodeArray=myDiagram.model.nodeDataArray;


                        //there are nodes in the diagram
                        if (nodeArray.length!=0)
                        {
                            it = myDiagram.nodes;

                            maxx= -999999999;
                            maxy= -999999999;
                            Bottom = null;

                            for ( i=0;i<=nodeArray.length-1;i++)
                            {
                                if (nodeArray[i].loc.y>=maxy)
                                {
                                    maxx=nodeArray[i].loc.x;
                                    maxy=nodeArray[i].loc.y;
                                    Bottom=i;
                                }

                            }

                            // nodeData= {category: "pic",text: NodeArray[minIdx].text,img: NodeArray[minIdx].img};
                            if (NodeArray[minIdx].category=="pic")
                            {
                                nodeData= {category: NodeArray[minIdx].category,text: NodeArray[minIdx].text,img: NodeArray[minIdx].img};

                            }
                            else if(NodeArray[minIdx].category=="Comment")
                            {
                                nodeData= {category: NodeArray[minIdx].category,text: NodeArray[minIdx].text};

                            }

                            nodeData.loc = new go.Point(maxx,maxy+200);
                            myDiagram.model.addNodeData(nodeData);
                            //alert(myDiagram.position);
                            myDiagram.position = new go.Point(maxx,maxy+600);
                            // select the new Node
                            newnode = myDiagram.findNodeForData(nodeData);
                            newlink = { from: nodeArray[Bottom].key, to: newnode.data.key};
                            myDiagram.model.addLinkData(newlink);


                        }

                        else
                        {
                            myDiagram.model.addNodeData(NodeArray[minIdx]);
                        }
                    }
                }

                myDiagram.commitTransaction("Add State");


            }
        },
        template:
            '<input id="searchtext"  ng-keyup="search($event)" ng-model="searchText"  ' +
            'placeholder="Search for items" autocomplete="on" > </input>'
    }
})



app.directive("saveboard",function(DiagramService){
    return{
        restrict:"E",
        link:function(scope){
            scope.relayout = function (){
                DiagramService.getDiagram().layoutDiagram(true);
            }
            scope.save = function () {
                str =  DiagramService.getDiagram().model.toJson();
                document.getElementById("mySavedModel").value = str;
            	return str;
            }
            scope.saveAsNamedFile = function (content) {
            	var blob = new Blob([content], {type: "text/plain; charset=utf-8"});
            	var fileName = document.getElementById("text-filename").value;
            	saveAs(blob, fileName+'.json');
            }
            scope.load = function () {
                str = document.getElementById("mySavedModel").value;
                DiagramService.getDiagram().model = go.Model.fromJson(str);
                DiagramService.getDiagram().undoManager.isEnabled = true;
            }


        },
        template:
            '<div id="SaveBoard">'+
             
            '<zippy><div type="button" class="btn btn-primary" ng-click="save();toggleContent();">Save</div>'+
            '<div  ng-show="isContentVisible" style="width: 500px; height: 200px; background-color:yellow;">'+
            '<textarea id="mySavedModel" style="width:100%;height:70%; display:none;"></textarea>'+
			'<form id="textSaved">'+
		'<label>Filename: <input type="text" class="filename" id="text-filename" placeholder="new" />.json</label>'+
		'</form><div type="button" class="btn btn-primary" ng-click="saveAsNamedFile(save())">Save File</div></div>'+
            '</zippy><div type="button" class="btn btn-primary" ng-click="load();">Load</div>' +
            ' <input type="file" onchange="readText(this)" />'+
            '<br />'+
            '</div>'
    }
})
app.directive("navButton",function(){
    return{
        restrict:"E",
        template: '<div  class="btn btn-primary" ng-click="Redo()">Redo</div>'

    }


})


