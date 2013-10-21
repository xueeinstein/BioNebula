app.service("DiagramService",function(RuntimeService){

    var myDiagram , $$,Palette,DefaultPattern,myPartContextMenu,navigator,undoDisplay;
    THRESHOLD =12500;
    var undoModel;
    var changedLog = document.getElementById("modelChangedLog");
    var editToRedo = null; // a node in the undoDisplay

    var editList = [];
    //--------------------------------------------------------------APIs

    function diagramInfo(model) {  // Tooltip info for the diagram's model
        return "Model:\n" + model.nodeDataArray.length + " nodes, " + model.linkDataArray.length + " links";
    }
    function linkInfo(d) {  // Tooltip info for a link data object
        return "Link:\nfrom " + d.from + " to " + d.to;
    }
    function makePort(name, spot, output, input) {
        // the port is basically just a small circle that has a white stroke when it is made visible
        return go.GraphObject.make(go.Shape,
            {
                figure: "Circle",
                fill: "transparent",
                stroke: null,  // this is changed to "white" in the showPorts function
                desiredSize: new go.Size(6, 6),
                alignment: spot, alignmentFocus: spot,  // align the port on the main Shape
                portId: name,  // declare this object to be a "port"
                fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
                fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
                cursor: "pointer" ,// show a different cursor to indicate potential link point
                // toMaxLinks: 1,fromMaxLinks:1,
                fromLinkableDuplicates: false, toLinkableDuplicates: false
            });
    }
    // Tooltip info for a node data object
    function nodeInfo(d) {
        str = "Node: " + d.text + "\n";
        if (d.des)
        	str += "Tags: " + d.des + "\n";
        if (d.group)
            str += "member of " + d.group;
        else
            str += "top-level node";
        return str;
    }
    // Make all ports on a node visible when the mouse is over the node
    function showPorts(node, show) {
        diagram = node.diagram;
        if (!diagram || diagram.isReadOnly || !diagram.allowLink) return;
        it = node.ports;
        while (it.next()) {
            port = it.value;
            port.stroke = (show ? "black" : null);
        }
    }
    function addChild () {

        selnode = myDiagram.selection.first();
        if (!(selnode instanceof go.Node)) return;
        myDiagram.startTransaction("add node and link");

        newnode = { key: "N" };
        myDiagram.model.addNodeData(newnode);
        newlink = { from: selnode.data.key, to: newnode.key };
        myDiagram.model.addLinkData(newlink);
        myDiagram.commitTransaction("add node and link");
    };


    //return the left most Node of a input tree
    function LeftiNode(Tree)
    {

        if (Tree==null || Tree==undefined)
            return null;
        if (Tree instanceof go.Link) { LeftiNode(Tree.toNode); }
        else {
            nodes = Tree.findNodesConnected();
            while (nodes.next()) {
                /* alert("minx: "+ minx + " x: " + nodes.value.location.x); */
                if (nodes.value.location.x<=minx) {

                    minx=nodes.value.location.x; LeftiNode(nodes.value);
                }
            }
        }
        return true;
    }
    //return the top Node of a input tree
    function UpperNode(Tree)
    {

        if (Tree===null || Tree===undefined)
            return null;
        if (Tree instanceof go.Link) { UpperNode(Tree.fromNode); }
        else {
            nodes = Tree.findNodesConnected();

            if (nodes!==null && nodes.count>0)
            {
                while (nodes.next()) {

                    if (nodes.value.location.y<=RuntimeService.miny) {


                        RuntimeService.miny=nodes.value.location.y; UpperNode(nodes.value);

                    }
                }

            }
            else
            {
                return null;
            }

        }
        return true;
    }

    //split a horizontal flow into 2 horizontal flows
    function SplitFlowx(e,obj)
    {
        myDiagram.startTransaction("Split flow");
        Link = myDiagram.selection.first();
        toNode = Link.toNode;
        fromNode = Link.fromNode;
        MoveSet = toNode.findTreeParts();
        myDiagram.model.removeLinkData(Link.data);


        offsetx =null;
//		if (LeftiNode(fromNode)!=null)
//		{
//			offsetx = minx-toNode.data.loc.x;
//		}
//		else
        {
            offsetx = fromNode.data.loc.x-toNode.data.loc.x;
        }
        minx = 99999999999999;


        myDiagram.moveParts(MoveSet,new go.Point(offsetx,200),true);
        myDiagram.commitTransaction("Split flow");
    }
    //split a vertical flow into 2 vertical flows
    function SplitFlowy(e,obj)
    {
        myDiagram.startTransaction("Split flow");
        Link = myDiagram.selection.first();
        toNode = Link.toNode;
        fromNode = Link.fromNode;
        MoveSet = toNode.findTreeParts();
        myDiagram.model.removeLinkData(Link.data);


        offsety =null;
        if (UpperNode(fromNode)!=null)
        {
            offsety = RuntimeService.miny-toNode.data.loc.y;

        }
        else
        {
            offsety = fromNode.data.loc.y-toNode.data.loc.y;
        }
        RuntimeService.miny = 99999999999999;


        myDiagram.moveParts(MoveSet,new go.Point(200,offsety),true);
        myDiagram.commitTransaction("Split flow");
    }


    function groupInfo(tt)
    {  // takes the tooltip, not a group node data object
        g = tt.adornedPart;  // get the Group that the tooltip adorns
        mems = g.memberParts.count;
        links = 0;
        it = g.memberParts;
        while (it.next()) {
            if (it.value instanceof go.Link) links++;
        }
        return "Group: " + g.data.text + "\n" + mems + " members including " + links + " links";
    }
    function highlightGroup(grp, show) {
        shape = grp.findObject("SHAPE");
        if (shape) {
            shape.fill = show ? dropFill : groupFill;
            shape.stroke = show ? dropStroke : groupStroke;
        }
    }
    function IsConnected(NodeA,NodeB)
    {
        if (NodeA instanceof go.Node)
        {
            it = NodeA.findNodesConnected();
            while (it.next())
            {

                if (it.value==NodeB)
                {

                    return true;
                }
            }
            return false;
        }
        return ;


    }

    // clicking the button inserts a new node to the right of the selected node and adds a link to that new node
    function addNodeAndLink(e, obj)
    {
        adorn = obj.part;
        if (adorn === null) return;
        e.handled = true;
        diagram = adorn.diagram;
        diagram.startTransaction("Add State");
        // get the node data for which the user clicked the button
        fromNode = adorn.adornedPart;
        fromData = fromNode.data;
        if( !(diagram instanceof go.Palette))
        {


            // create a new "State" data object, positioned off to the right of the adorned Node
            type= document.getElementById('defaultPattern').value;
            if (type!="")
            {
                minInd=50;
                minIdx=-1;
                for ( i=0; i<=NodeArray.length-1;i++)
                {

                    indicator =NodeArray[i].text.indexOf(type.toLowerCase());

                    if (indicator>=0)
                    {
                        if (indicator<=minInd)
                        {
                            minInd=indicator;
                            minIdx=i;
                        }


                    }
                }
                toData;
                if (NodeArray[minIdx].category=="pic")
                {
                    toData= {category: NodeArray[minIdx].category,text: NodeArray[minIdx].text,img: NodeArray[minIdx].img};

                }
                else if(NodeArray[minIdx].category=="Comment")
                {
                    toData= {category: NodeArray[minIdx].category,text: NodeArray[minIdx].text};

                }
            }
            else
            {
                toData = {text: "new"}

            }

            p = fromNode.location;
            toData.loc = new go.Point(p.x,p.y+200);  // the "loc" property is a string, not a Point object
            // add the new node data to the model
            model = diagram.model;
            model.addNodeData(toData);
            // create a link data from the old node data to the new node data
            linkdata = {};
            linkdata[model.linkFromKeyProperty] = model.getKeyForNodeData(fromData);
            linkdata[model.linkToKeyProperty] = model.getKeyForNodeData(toData);
            // and add the link data to the model
            model.addLinkData(linkdata);
            // select the new Node
            newnode = diagram.findNodeForData(toData);
            diagram.select(newnode);
            diagram.commitTransaction("Add State");

        }
        else
        {
            myDiagram.startTransaction("Add State");
            fromNode.data.loc = new go.Point(maxx,maxy+400);
            maxx=maxx+400;
            myDiagram.model.addNodeData(fromNode.data);
            myDiagram.commitTransaction("Add State");
        }

    }
    function relayout()
    {
        myDiagram.layoutDiagram(true);
    }
    function changeLayout()
    {
        myDiagram.startTransaction("Change Layout");
        type= document.getElementById('selectLayout').value;
        switch (type) {
            case "normal": myDiagram.layout = new go.Layout();break;
            case "grid": myDiagram.layout =$$(go.GridLayout,
                { comparer: go.GridLayout.smartComparer });
                break;
            case "tree": myDiagram.layout = $$(go.TreeLayout, {
                comparer: go.LayoutVertex.smartComparer  // have the comparer sort by numbers as well as letters
                // other properties are set by the layout function, defined below
            }); break;
            case "Digraph": myDiagram.layout = $$(go.LayeredDigraphLayout, { isOngoing: false, layerSpacing: 50 });
                break;
            case "Circular":   myDiagram.layout = new go.CircularLayout(); break;
        }
        myDiagram.commitTransaction("Add Link");
    }
    function HaveExternalTempLink(FromKey,ToKey)
    {
        if (tempExternalLinkArray!=null)
        {
            len = tempExternalLinkArray.length;
            for ( i=0; i<=len-1; i++)
            {
                if (tempExternalLinkArray[i].from==FromKey && tempExternalLinkArray[i].to==ToKey)
                {
                    return true;
                }

            }
            return false;
        }
        return false;


    }
    function SquaredDistance(pointA,pointB)
    {
        return (pointA.x-pointB.x)*(pointA.x-pointB.x)+(pointA.y-pointB.y)*(pointA.y-pointB.y);

    }
    function ResetTempForBridge()
    {
        //flagLinkEnter=null;
        TempLocLinkEnter=null;
        GlobfromNode =null;
        GlobtoNode =null;
        LinkFromHold =null;
        LinkHoldTo =null;
    }
    function IsExisted(link)
    {
        model = myDiagram.model;
        len = model.linkDataArray.length;
        for ( i=0; i<=len-1;i++)
        {

            if ((link.from===model.linkDataArray[i].from && link.to===model.linkDataArray[i].to)
                || (link.from===model.linkDataArray[i].to && link.to===model.linkDataArray[i].from))
            {
                return true;

            }
        }

        return false;



    }
    function GetLinkFromKeys(FromKey,ToKey)
    {
        model = myDiagram.model;
        len = model.linkDataArray.length;
        for ( i=0; i<=len-1;i++)
        {
            if (model.linkDataArray[i].from==FromKey && model.linkDataArray[i].to==ToKey)
            {
                return model.linkDataArray[i];
            }
        }
        return null;
    }
    function HaveTempLink(FromKey,ToKey)
    {
        if (RuntimeService.tempLinkArray!=null)
        {
            len = RuntimeService.tempLinkArray.length;
            for ( i=0; i<=len-1; i++)
            {
                if ((RuntimeService.tempLinkArray[i].from==FromKey && RuntimeService.tempLinkArray[i].to==ToKey)
                    || (RuntimeService.tempLinkArray[i].from==ToKey && RuntimeService.tempLinkArray[i].to==FromKey))
                {
                    return true;
                }

            }
            return false;
        }
        return false;


    }
    function CreateNewNode(myDiagram,Category,img,text,pos)
    {
        if (Category!=null && img!=null && text!=null
            &&Category!=undefined && img!=undefined && text!=undefined)
        {
            myDiagram.startTransaction("add node");
            // newnode = {category: DefaultPattern.category, text: DefaultPattern.text ,img: DefaultPattern.img};
            newnode = {category: Category, img: img , text: text};
            if (pos!=null && pos!=undefined)
            {
                newnode.loc = new go.Point(pos.x,pos.y);
            }
            myDiagram.model.addNodeData(newnode);
            myDiagram.commitTransaction("add node");
            return newnode;
        }
        return false;
    }
    function ConnectTwoNodes(keyNodeA,keyNodeB)
    {
        if (keyNodeA!=null && keyNodeA!=undefined && keyNodeB!=null && keyNodeB!=undefined)
        {

            newlink = { from : keyNodeA, to: keyNodeB, color: "black"};
            myDiagram.startTransaction("Add Link");
            myDiagram.model.addLinkData(newlink);
            myDiagram.commitTransaction("Add Link");
            return true;
        }
        return false;

    }
    function NodeArray()
    {
        NodeArr = new Array();
        NodeArr[0]={category: "pic", text: "promoter",img: "img/promoter.png",des:"#promoter"};
        NodeArr[1]={category: "pic", text: "weak promoter",img: "img/weak promoter.png",des: "#promoter #constitutive #weak"};
        NodeArr[2]={category: "pic", text: "medium promoter",img: "img/medium promoter.png",des: "#promoter #constitutive #medium"};
        NodeArr[3]={category: "pic", text: "strong promoter",img: "img/strong promoter.png",des:"#promoter #constitutive #strong"};
        NodeArr[4]={category: "pic", text: "inducer",img: "img/promoter.png",des:"#promoter #senstive"};
        NodeArr[5]={category: "pic", text: "repressor",img: "img/promoter.png",des:"#promoter #senstive"};
        NodeArr[6]={category: "pic", text: "bacterial promoter",img: "img/promoter.png",des:"#promoter #source"};
        NodeArr[7]={category: "pic", text: "phage promoter", img:"img/promoter.png",des:"#promoter #source"};
        NodeArr[8]={category: "pic", text: "IPTG",img: "img/promoter.png",des:"#promoter #senstive #inducer"};
        NodeArr[9]= {category: "pic", text: "LasI/LasR",img: "img/promoter.png",des:"#promoter #senstive #inducer"};
        NodeArr[10]= {category: "pic", text: "RhII/RhIR",img: "img/promoter.png",des:"#promoter #senstive #inducer"};
        NodeArr[11]= {category: "pic", text: "metal ion",img: "img/promoter.png",des:"#promoter #senstive #inducer"};
        NodeArr[12]= {category: "pic", text: "TetR",img: "img/promoter.png",des:"#promoter #senstive #repressor"};
        NodeArr[13]= {category: "pic", text: "LuxR",img: "img/promoter.png",des:"#promoter #senstive #repressor"};
        NodeArr[14]= {category: "pic", text: "lambda cI",img: "img/promoter.png",des:"#promoter #senstive #repressor"};
        NodeArr[15]= {category: "pic", text: "reporter",img: "img/reporter.png",des:"#promoter #by products"};
        NodeArr[16]= {category: "pic", text: "GFP family",img: "img/reporter.png",des:"#promoter #by products #reporter"};
        NodeArr[17]= {category: "pic", text: "RFP family",img: "img/reporter.png",des:"#promoter #by products #reporter"};
        NodeArr[18]= {category: "pic", text: "regulators",img: "img/promoter.png",des:"#promoter #by products"};
        NodeArr[19]= {category: "pic", text: "activator",img: "img/promoter.png",des:"#promoter #by products #regulators"};
        NodeArr[20]= {category: "pic", text: "repressor",img: "img/promoter.png",des:"#promoter #by products #regulators"};
        NodeArr[21]= {category: "pic", text: "multiple regulators",img: "img/promoter.png",des:"#promoter #by products #regulators"};
        NodeArr[22]= {category: "pic", text: "product(selection marker)",img: "img/promoter.png",des:"#promoter #by products"};
        NodeArr[23]= {category: "pic", text: "product(enzymes)",img: "img/promoter.png",des:"#promoter #by products"};
        NodeArr[24]= {category: "pic", text: "structure(fusion protein)",img: "img/promoter.png",des:"#promoter #by structure"};
        NodeArr[25]= {category: "pic", text: "structure(robust device)",img: "img/promoter.png",des:"#promoter #by structure"};
        NodeArr[26]= {category: "pic", text: "structure(transcriptional units)",img: "img/promoter.png",des:"#promoter #by structure"};
        NodeArr[27]= {category: "pic", text: "structure(protein generator)",img: "img/promoter.png",des:"#promoter #by structure"};
        NodeArr[28]= {category: "pic", text: "structure(CDS only)",img: "img/promoter.png",des:"#promoter #by structure"};
        NodeArr[29]={category: "pic", text: "RBS", img:"img/rbs.png",des:"#rbs"};
        NodeArr[30]={category: "pic", text: "terminator", img:"img/terminator.png",des:"#terminator"};
        NodeArr[31]={category: "pic", text: "direction(forward)", img:"img/terminator.png",des:"#terminator #direction"};
        NodeArr[32]={category: "pic", text: "direction(reverse)", img:"img/terminator.png",des:"#terminator #direction"};
        NodeArr[33]={category: "pic", text: "direction(bidirectional)", img:"img/terminator.png",des:"#terminator #direction"};
        NodeArr[34]={category: "pic", text: "T7 RNAP specific", img:"img/terminator.png",des:"#terminator #RNAP specific"};
        NodeArr[35]={category: "pic", text: "bacterial terminators", img:"img/terminator.png",des:"#terminator #by source"};
        NodeArr[36]={category: "pic", text: "phage terminators", img:"img/terminator.png",des:"#terminator #by source"};
        NodeArr[37]={category: "pic", text: "artificial terminators", img:"img/terminator.png",des:"#terminator #by source"};
        NodeArr[38]={category: "pic", text: "inverter", img:"img/inverter.png",des:"#device"};
        NodeArr[39]={category: "pic", text: "signaling", img:"img/signaling.png",des:"#device"};
        NodeArr[40]={category: "pic", text: "sender only", img:"img/signaling.png",des:"#device #signaling"};
        NodeArr[41]={category: "pic", text: "positive signal", img:"img/signaling.png",des:"#device #signaling"};
        NodeArr[42]={category: "pic", text: "negative signal", img:"img/signaling.png",des:"#device #signaling"};
        NodeArr[43]={category: "pic", text: "multiple signal", img:"img/signaling.png",des:"#device #signaling"};
        NodeArr[44]={category: "pic", text: "CDS", img:"img/cds.png",des:"#cds"};
        NodeArr[45]={category: "Comment", text: "comment", img:"",des:""};
        return NodeArr;
    }
    function partContextMenu($, DefaultPattern)
    {
        // define the shared context menu for all Nodes, Links, and Groups
        partContextMenu =
            $$(go.Adornment, go.Panel.Horizontal,
                $$(go.Panel, go.Panel.Vertical,
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Insert a new block here"),
                        { click: function(e, obj) { MakeBridge(e,obj); } },
                        new go.Binding("visible", "", function(o) { return !o.diagram.commandHandler.canGroupSelection(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Cut"),
                        { click: function(e, obj) { e.diagram.commandHandler.cutSelection(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canCutSelection(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Copy"),
                        { click: function(e, obj) { e.diagram.commandHandler.copySelection(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canCopySelection(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Paste"),
                        { click: function(e, obj) { e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canPasteSelection(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Delete"),
                        { click: function(e, obj) { e.diagram.commandHandler.deleteSelection(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canDeleteSelection(); }).ofObject()),

                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Undo"),
                        { click: function(e, obj) { e.diagram.commandHandler.undo(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canUndo(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Redo"),
                        { click: function(e, obj) { e.diagram.commandHandler.redo(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canRedo(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Group"),
                        { click: function(e, obj) { e.diagram.commandHandler.groupSelection(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canGroupSelection(); }).ofObject()),
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "Ungroup"),
                        { click: function(e, obj) { e.diagram.commandHandler.ungroupSelection(); } },
                        new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canUngroupSelection(); }).ofObject()) ,
                    $$("ContextMenuButton",
                        $$(go.TextBlock, "split a flow"),
                        { click: function(e, obj) { SplitFlowy(e,obj); } },
                        new go.Binding("visible", "", function(o) { return !o.diagram.commandHandler.canGroupSelection(); }).ofObject())
                ));


    }
    function search(event)
    {

        //alert (event.keyCode);

        myDiagram.startTransaction("Add State");
        searchtext="";

        len=0;
        indicator=0;

        searchtext = document.getElementById("searchtext").value;
        if (searchtext==="")
        {
            searchtext= document.getElementById("infobar").value;


        }
        //init
        myPalette.model= new go.GraphLinksModel();



        minInd=50;
        minIdx=-1;

        if (searchtext.trim()!="")
        {
            for ( i=0; i<=NodeArray.length-1;i++)
            {

                indicator =NodeArray[i].text.indexOf(searchtext.toLowerCase());

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


                    newlink = { from: nodeArray[Bottom].key, to: newnode.data.key};
                    myDiagram.model.addLinkData(newlink);
                    //alert(myDiagram.position);

                }

                else
                {
                    myDiagram.model.addNodeData(NodeArray[minIdx]);
                }
            }
        }

        myDiagram.commitTransaction("Add State");

    }
    function MakeBridge(e,obj)
    {

        Link = myDiagram.selection.first();
        fromNode = Link.fromNode;
        toNode = Link.toNode;
        //remove the Link
        myDiagram.startTransaction("make bridge");
        myDiagram.model.removeLinkData(Link.data);

        //add a new node
        newnode = {category: DefaultPattern.category, text: DefaultPattern.text ,img: DefaultPattern.img};
        newnode.loc = new go.Point(e.documentPoint.x,e.documentPoint.y);
        myDiagram.model.addNodeData(newnode);
        newnode = myDiagram.findNodeForData(newnode);

        //add new links fromNode -> a new node
        newlink = { from: fromNode.data.key, to: newnode.data.key ,  color: "black"};
        myDiagram.model.addLinkData(newlink);

        //add new links newnode -> toNode
        newlink = { from: newnode.data.key, to: toNode.data.key, color: "black" };
        myDiagram.model.addLinkData(newlink);

        myDiagram.commitTransaction("make bridge");
        DefaultPattern = NodeArray[0];


    }
    // Show the diagram's model in JSON format that the user may have edited
    function save() {
        str = myDiagram.model.toJson();
        document.getElementById("mySavedModel").value = str;
    }
    function load() {
        str = document.getElementById("mySavedModel").value;
        myDiagram.model = go.Model.fromJson(str);
        myDiagram.undoManager.isEnabled = true;
    }
    //




   return {
       getDiagram : function(){
           return myDiagram
       },
       getNodeArray : function(){
           return myNodes;
       },
       getPalette : function(){
           return Palette;
       },
       getGoMake : function(){
           return $$;
       },
       getUndoDisplay : function(){
        return undoDisplay;
       },
       Init : function(){
           myDiagram = new go.Diagram("myDiagram")  // create a Diagram for the DIV HTML element
           $$ = go.GraphObject.make // for conciseness in defining templates


           // initialize the Palette
           Palette = $$(go.Palette, "myPalette") // must name or refer to the DIV HTML element
           myNodes = new NodeArray()
           DefaultPattern= myNodes[0]
           myPartContextMenu = new partContextMenu($$,DefaultPattern)
           navigator= new go.Overview("navigator")
           navigator.observed = myDiagram
       },


    //load Node Template
    LoadNodeTemplate : function ($$)
    {
        // provide a tooltip for the background of the Diagram, when not over any Part
        myDiagram.toolTip =
            $$(go.Adornment, go.Panel.Auto,
                $$(go.Shape, { fill: "#FFFFCC" }),
                $$(go.TextBlock, { margin: 4 },
                    new go.Binding("text", "", diagramInfo)));

        // define several shared Brushes

        graygrad = $$(go.Brush, go.Brush.Linear, { 0: "rgb(150, 150, 150)", 0.5: "rgb(86, 86, 86)", 1: "rgb(86, 86, 86)" });
        greengrad = $$(go.Brush, go.Brush.Linear, { 0: "rgb(98, 149, 79)", 1: "rgb(17, 51, 6)" });
        redgrad = $$(go.Brush, go.Brush.Linear, { 0: "rgb(156, 56, 50)", 1: "rgb(82, 6, 0)" });
        yellowgrad = $$(go.Brush, go.Brush.Linear, { 0: "rgb(254, 201, 0)", 1: "rgb(254, 162, 0)" });

        // define the Node template for regular nodes
        myDiagram.nodeTemplateMap.add("",// the default category
            $$(go.Node, go.Panel.Spot,
                // The Node.location comes from the "loc" property of the node data,
                // If the Node.location is changed, it updates the "loc" property of the node data,
                new go.Binding("location", "loc").makeTwoWay(),
                { locationSpot: go.Spot.Center, isShadowed: true },
                //{ resizable: true },{ rotatable: true},
                { mouseEnter: function(e, obj) { showPorts(obj.part, true); },
                    mouseLeave: function(e, obj) { showPorts(obj.part, false); } },
                // the main object is a Panel that surrounds a picture over a TextBlock with a rectangular Shape
                $$(go.Panel, go.Panel.Auto,
                    $$(go.Shape,
                        {name: "shape", fill:greengrad },new go.Binding("figure","figure").makeTwoWay()
                        ,new go.Binding("fill","fill")
                    ),
                    $$(go.TextBlock,
                        {  margin: 5, text: "text",
                            font: "bold 9pt Helvetica, Arial, sans-serif", editable: true ,isMultiline: false,
                            stroke: "rgb(190, 247, 112)" },new go.Binding("text","text")
                    )),

                // four named ports, one on each side:
                makePort("T", go.Spot.Top, true, true),
                makePort("L", go.Spot.Left, true, true),
                makePort("R", go.Spot.Right, true, true),
                makePort("B", go.Spot.Bottom, true, true),

                { toolTip:
                    $$(go.Adornment, go.Panel.Auto,
                        $$(go.Shape, { fill: "#FFFFCC" }),
                        $$(go.TextBlock, { margin: 4 },  // the tooltip shows the result of calling nodeInfo(data)
                            new go.Binding("text", "", nodeInfo))),
                    contextMenu: partContextMenu }
            ));


        //Define another node template name : pic
        myDiagram.nodeTemplateMap.add("pic",
            $$(go.Node,
                go.Panel.Spot,{ locationSpot: go.Spot.Center, isShadowed: false},new go.Binding("location", "loc").makeTwoWay(),
                // { fromSpot: go.Spot.Right, toSpot: go.Spot.Left },
                { mouseEnter: function(e, obj) { showPorts(obj.part, true); },
                    mouseLeave: function(e, obj) { showPorts(obj.part, false); } },
                $$(go.Panel, go.Panel.Table,
                    $$(go.Panel,go.Panel.Table,
                        $$(go.Shape,
                            {name: "shape", fill:"white",stroke: "white",desiredSize: new go.Size(50, 50),
                                portId: "C",fromLinkable: true, toLinkable: true
                            }),
                        $$(go.Picture,
                            {row: 0, column: 0 },new go.Binding("source", "img"))
                        ,
                        makePort("T", go.Spot.Top, true, true),
                        //makePort("C", go.Spot.Center, true, true),
                        makePort("L", go.Spot.Left, true, true),
                        makePort("R", go.Spot.Right, true, true),
                        makePort("B", go.Spot.Bottom, true, true)
                    ),
                    $$(go.TextBlock,
                        {column:0,row:1,editable: true,isMultiline: false, textAlign: "center",
                            font: "bold 9pt Helvetica, Arial, sans-serif"},new go.Binding("text", "text").makeTwoWay()),
                    $$(go.TextBlock,
                        {column:0,row:2,editable: true,isMultiline: true, textAlign: "center",
                            font: "bold 9pt Helvetica, Arial, sans-serif"},new go.Binding("text", "text2").makeTwoWay())
                ),

                // three named ports, one on each side except the top, all output only:


                { toolTip:
                    $$(go.Adornment, go.Panel.Auto,
                        $$(go.Shape, { fill: "#FFFFCC" }),
                        $$(go.TextBlock, { margin: 4 },  // the tooltip shows the result of calling nodeInfo(data)
                            new go.Binding("text", "", nodeInfo))),
                    contextMenu: partContextMenu },

                { selectionAdornmentTemplate:
                    $$(go.Adornment, go.Panel.Spot,
                        $$(go.Panel, go.Panel.Auto,
                            // this Adornment has a rectangular blue Shape around the selected node
                            $$(go.Shape, { fill: null, stroke: "dodgerblue", strokeWidth: 3 }),
                            $$(go.Placeholder))

                    ) }
            ));
        // Define another node template : comment
        myDiagram.nodeTemplateMap.add("Comment",
            $$(go.Node, "Auto", 
                new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
                { mouseEnter: function(e, obj) { showPorts(obj.part, true); },
                    mouseLeave: function(e, obj) { showPorts(obj.part, false); } },
                $$(go.Shape, "File",
                    { fill: yellowgrad ,stroke: null,},
                    new go.Binding("figure", "figure")),
                    
                $$(go.TextBlock,
                    { margin: 6,
                        maxSize: new go.Size(200, NaN),
                        wrap: go.TextBlock.WrapFit,
                        textAlign: "center",
                        editable: true,
                        font: "bold 9pt Helvetica, Arial, sans-serif" },
                    new go.Binding("text", "text").makeTwoWay()),
                makePort("T", go.Spot.Top, true, true),
                makePort("L", go.Spot.Left, true, true),
                makePort("R", go.Spot.Right, true, true),
                makePort("B", go.Spot.Bottom, true, true),
                { toolTip:
                    $$(go.Adornment, go.Panel.Auto,
                        $$(go.Shape, { fill: "#FFFFCC" }),
                        $$(go.TextBlock, { margin: 4 },  // the tooltip shows the result of calling nodeInfo(data)
                            new go.Binding("text", "", nodeInfo))),
                    contextMenu: partContextMenu }
            ));

        //selection adornment template which is showed when the node is selected
        myDiagram.nodeTemplate.selectionAdornmentTemplate =
            $$(go.Adornment, go.Panel.Spot,
                $$(go.Panel, go.Panel.Auto,
                    $$(go.Shape, { fill: null, stroke: "blue", strokeWidth: 2 }),
                    $$(go.Placeholder)),
                // the button to create a "next" node, at the top-right corner
                $$("Button",
                    { alignment: go.Spot.TopRight,
                        click: addNodeAndLink },  // this function is defined below
                    $$(go.Shape, { figure: "PlusLine", desiredSize: new go.Size(6, 6) })
                ) // end button
            ); // end adornment




    },
    //load palette
    LoadPalette : function ()
    {
        Palette.layout= $$(go.GridLayout,{ comparer: go.GridLayout.smartComparer });
        Palette.layout.wrappingColumn = NaN;
        Palette.layout.wrappingWidth=NaN;
        Palette.nodeTemplateMap = myDiagram.nodeTemplateMap;  // share the templates used by myDiagram
        Palette.groupTemplate = myDiagram.groupTemplate;
        // specify the contents of the Palette
        Palette.model = new go.GraphLinksModel(  // specify the contents of the Palette
            [

                myNodes[0],myNodes[29],myNodes[30],myNodes[44],myNodes[38],myNodes[39],myNodes[45]

            ]);
    },

    //load Settings
    LoadSettings : function ()
    {

        myDiagram.allowZoom=true; // allow zoom ability
        myDiagram.grid.visible=true;// show grid on the diagram
        // when the user drags a node, also move/copy/delete the whole subtree starting with that node
        myDiagram.commandHandler.copiesTree = true;
        myDiagram.initialContentAlignment = go.Spot.Center;  // center the whole graph
        myDiagram.initialAutoScale = go.Diagram.Uniform; //Diagram are scaled uniformly until the documentBounds fits in the view.
        // Diagram.toolManager.linkingTool.direction = go.LinkingTool.ForwardsOnly;
        myDiagram.initialContentAlignment = go.Spot.Center;

        // temporary links used by LinkingTool and RelinkingTool are also orthogonal:
        myDiagram.toolManager.linkingTool.temporaryLink.routing = go.Link.Orthogonal;
        myDiagram.toolManager.relinkingTool.temporaryLink.routing = go.Link.Orthogonal;
        // have mouse wheel events zoom in and out instead of scroll up and down
        //myDiagram.toolManager.mouseWheelBehavior = go.ToolManager.WheelZoom;
        myDiagram.toolManager.draggingTool.isGridSnapEnabled = true;    // enable dragging tool
        myDiagram.toolManager.resizingTool.isGridSnapEnabled = true;    // enable resizing tool
        myDiagram.undoManager.isEnabled = true; //enable undo ability


        // allow double-click in background to create a new node
        myDiagram.toolManager.clickCreatingTool.archetypeNodeData =DefaultPattern;

        // allow the group command to execute
        myDiagram.commandHandler.archetypeGroupData =
        { key: "Group", isGroup: true, color: "blue" };
        // modify the default group template to allow ungrouping
        myDiagram.groupTemplate.ungroupable = true;
        myDiagram.allowDrop = true;  // handle drag-and-drop from the Palette
        // create the model data that will be represented in both diagrams simultaneously
        myDiagram.model = $$(go.GraphLinksModel,
            {
                linkFromPortIdProperty: "fromPort",  // required information:
                linkToPortIdProperty: "toPort"      // identifies data property names
            });
        myDiagram.autoScrollRegion= (100, 100, 100, 100);

    } ,

    //load Link Template
    LoadLinkTemplate : function ()
    {
        // define the link template
        myDiagram.linkTemplate =
            $$(go.Link,  // the whole link panel
                { selectionAdornmentTemplate:
                    $$(go.Adornment, //when the link is selected
                        $$(go.Shape,  // the link path shape
                            { isPanelMain: true, stroke: "dodgerblue", strokeWidth: 3 }),
                        $$(go.Shape,  // the arrowhead
                            { toArrow: "Standard", fill: "dodgerblue", stroke: null, scale: 1 })),
                    routing: go.Link.Normal,
                    curve: go.Link.Bezier,
                    toShortLength: 2 },

                {
                    routing: go.Link.AvoidsNodes, // links will avoid nodes
                    curve: go.Link.JumpOver, // when 2 links cross, 1 will jump over
                    toShortLength: 2,
                    relinkableFrom: true,  corner: 5,
                    relinkableTo: true, reshapable:true //resegmentable: true,
                    /* mouseDragEnter: domouseDragEnter */},
                //when the link is not selected
                $$(go.Shape,  //  the link shape
                    { name: "LINKSHAPE", isPanelMain: true,stroke: "black", strokeWidth: 2,fill: "whitesmoke" },new go.Binding("stroke", "color").makeTwoWay()),
                $$(go.Shape,  //  the arrowhead
                    { name: "LINKSHAPE", toArrow: "Standard" },new go.Binding("stroke", "color").makeTwoWay()),
                { toolTip:  //  define a tooltip for each link that displays its information
                    $$(go.Adornment, go.Panel.Auto,
                        $$(go.Shape, { fill: "#EFEFCC" }),
                        $$(go.TextBlock, { margin: 4 },
                            new go.Binding("text",  "" ,linkInfo))),
                    contextMenu: partContextMenu });
    },

    //load Group Template
    LoadGroupTemlate : function ()
    {
        //Define some fills and strokes
        groupFill = "rgba(128,128,128,0.2)";
        groupStroke = "gray";
        dropFill = "pink";
        dropStroke = "red";
        // Groups consist of a title in the color given by the group node data
        // above a translucent gray rectangle surrounding the member parts

        //Default group template , also indicate group's template when it's opened
        myDiagram.groupTemplateMap.add("",
            $$(go.Group, go.Panel.Vertical, new go.Binding("location", "loc").makeTwoWay(),
                { selectionObjectName: "PANEL",
                    locationObjectName:"PANEL",		// selection handle goes around shape, not label
                    ungroupable: true ,  isSubGraphExpanded: true ,
                    subGraphExpandedChanged: function(g) {      /* g.category = "Collapsed"; */      }},
                $$("SubGraphExpanderButton"), // enable Ctrl-Shift-G to ungroup a selected Group

                { // what to do when a drag-over or a drag-drop occurs on a Group
                    mouseDragEnter: function(e, grp, prev) {
                        highlightGroup(grp, grp.canAddMembers(grp.diagram.selection));
                    },
                    mouseDragLeave: function(e, grp, next) {
                        highlightGroup(grp, false);
                    },
                    mouseDrop: function(e, grp) {
                        ok = grp.addMembers(grp.diagram.selection, true);
                        if (!ok) grp.diagram.currentTool.doCancel();
                    }
                },

                $$(go.Panel, go.Panel.Auto,
                    { name: "PANEL" },
                    $$(go.Shape, "Rectangle",
                        // the rectangular shape around the members
                        { name: "SHAPE",fill: groupFill, stroke: "gray", strokeWidth: 3 }),
                    $$(go.Placeholder, { padding: 10 })),
                $$(go.TextBlock,
                    { font: "bold 12pt sans-serif",
                        isMultiline: false,  // don't allow newlines in text
                        editable: true,text: "group" },  // allow in-place editing by user
                    new go.Binding("text", "text").makeTwoWay(),
                    new go.Binding("stroke", "color")),		  // represents where the members are
                { toolTip:
                    $$(go.Adornment, go.Panel.Auto,
                        $$(go.Shape, { fill: "#FFFFCC" }),
                        $$(go.TextBlock, { margin: 4 },
                            // bind to tooltip, not to Group.data, to allow access to Group properties
                            new go.Binding("text", "", groupInfo).ofObject())),
                    contextMenu: partContextMenu }));

        //group 's template when it's collapsed
        myDiagram.groupTemplateMap.add("Collapsed",
            $$(go.Group,go.Panel.Vertical, new go.Binding("location", "loc").makeTwoWay(),
                { selectionObjectName: "PANEL",isSubGraphExpanded: false,
                    locationObjectName:"PANEL",
                    subGraphExpandedChanged: function(g) { g.category = ""; }
                },$$("SubGraphExpanderButton"),

                $$(go.Shape,
                    {name: "shape", fill:"white",stroke: "white",desiredSize: new go.Size(50, 50)}),
                $$(go.Picture,
                    {row: 0, column: 0 ,source: "queue.png"}),
                $$(go.TextBlock,
                    { font: "bold 12pt sans-serif",
                        isMultiline: false,  // don't allow newlines in text
                        editable: true })
            ));

    },

    //background contextmenu
    ContextMenu : function (){
        // provide a context menu for the background of the Diagram, when not over any Part
        myDiagram.contextMenu =
            $$(go.Adornment, go.Panel.Vertical,
                $$("ContextMenuButton",
                    $$(go.TextBlock, "Paste"),
                    { click: function(e, obj) { e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint); } },
                    new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canPasteSelection(); }).ofObject()),
                $$("ContextMenuButton",
                    $$(go.TextBlock, "Undo"),
                    { click: function(e, obj) { e.diagram.commandHandler.undo(); } },
                    new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canUndo(); }).ofObject()),
                $$("ContextMenuButton",
                    $$(go.TextBlock, "Select all"),
                    { click: function(e, obj) { e.diagram.commandHandler.selectAll(); } }
                ),
                $$("ContextMenuButton",
                    $$(go.TextBlock, "Redo"),
                    { click: function(e, obj) { e.diagram.commandHandler.redo(); } },
                    new go.Binding("visible", "", function(o) { return o.diagram.commandHandler.canRedo(); }).ofObject()) );

    },

    SetCustomPanningTool : function(){
       function CustomPanningTool() {
           go.PanningTool.call(this);
       }
       go.Diagram.inherit(CustomPanningTool, go.PanningTool);

       CustomPanningTool.prototype.canStart = function() {
           if (!this.isEnabled) return false;
           diagram = this.diagram;
           if (diagram === null) return false;
           if (!diagram.allowHorizontalScroll && !diagram.allowVerticalScroll) return false;
           // require right button & that it has moved far enough away from the mouse down point, so it isn't a click
           // CHANGED to check InputEvent.right INSTEAD OF InputEvent.left
           if (!diagram.lastInput.right) return false;
           // don't include the following check when this tool is running modally
           if (diagram.currentTool !== this) {
               // mouse needs to have moved from the mouse-down point
               if (!this.isBeyondDragSize()) return false;
           }
           return true;
       };

       myDiagram.toolManager.panningTool = new CustomPanningTool();


   },

    SetCustomLinkingTool : function(){
        function CustomLinkingTool() {
            go.LinkingTool.call(this);
        }
        go.Diagram.inherit(CustomLinkingTool, go.LinkingTool);

        myDiagram.toolManager.linkingTool = new CustomLinkingTool();

        CustomLinkingTool.prototype.doMouseUp = function() {
            if (this.isActive && this.findTargetPort(this.isForwards) === null) {

                Node = this.originalFromNode;
                pos = new go.Point(this.diagram.lastInput.documentPoint.x,this.diagram.lastInput.documentPoint.y);
                this.doCancel();
                CreateNode=CreateNewNode(myDiagram,Node.data.category,Node.data.img,Node.data.text,pos);
                newnode = myDiagram.findNodeForData(CreateNode);
                ConnectTwoNodes(Node.data.key,newnode.data.key);

            } else {

                go.LinkingTool.prototype.doMouseUp.call(this);
                //  Node = this.originalFromNode;
                // test=this;
                // alert(this.temporaryToNode+ " "+this.findTargetPort(this.isForwards));
                //ConnectTwoNodes(Node.data.key,this.temporaryToNode.key);

            }
        };


    },

    // DiagramListener when ExternalObjectsDropped
    ExternalObjectsDroppedListener : function(RuntimeService,myDiagram){
       myDiagram.addDiagramListener("ExternalObjectsDropped",
           function(e)
           {

               JustAddedNode = e.subject.first();
               if (myDiagram.model.nodeDataArray!=null)
               {


                   for ( i=0; i<=RuntimeService.tempExternalLinkArray.length-1;i++)
                   {

                       link = RuntimeService.tempExternalLinkArray[i];
                       // alert(link.from+ " "+ link.to);
                       if (IsExisted(link)==false && (link.from==JustAddedNode.data.key || link.to == JustAddedNode.data.key)
                           &&(link.from!=link.to))
                       {

                           myDiagram.startTransaction("Add Link");
                           myDiagram.model.addLinkData(link);
                           myDiagram.commitTransaction("Add Link");
                       }

                   }
                   RuntimeService.tempExternalLinkArray.splice(0,RuntimeService.tempExternalLinkArray.length);

               }
               holdNode= myDiagram.selection.first();
               list = myDiagram.nodes;
               itr = list.iterator;
               count=0;

               //connect the hold node with the nodes in the area within the THRESHOLD by the templinks
               while (itr.next()) {
                   val = itr.value;
                   dist = (holdNode.data.loc.x-val.data.loc.x)*(holdNode.data.loc.x-val.data.loc.x)
                       +(holdNode.data.loc.y-val.data.loc.y)*(holdNode.data.loc.y-val.data.loc.y);
                   if (dist <= THRESHOLD && val!=holdNode && IsConnected(holdNode,val)==false &&
                       !(holdNode instanceof go.Group)
                       && !(val instanceof go.Group) )
                   {
                       newlink = { from: val.data.key, to: holdNode.data.key , color: "black"};
                       len= myDiagram.model.linkDataArray.length;


                       //make sure it doesn't link to itself
                       if (holdNode.data.key!=val.data.key )
                       {
                           /* if (holdNode.data.loc.x>=val.data.loc.x)
                            {
                            newlink.fromPort="L";
                            newlink.toPort="R";
                            }
                            else
                            {
                            newlink.fromPort="R";
                            newlink.toPort="L";
                            } */
                           myDiagram.startTransaction("Add Link");
                           myDiagram.model.addLinkData(newlink);
                           myDiagram.commitTransaction("Add Link");


                       }
                   }

               }

               //remove all the templinks for each pair of nodes whose distance is above THRESHOLD
               list = myDiagram.nodes;
               itr = list.iterator;
               holdNode= myDiagram.selection.first();
               while (itr.next()) {
                   val = itr.value;
                   dist = (holdNode.data.loc.x-val.data.loc.x)*(holdNode.data.loc.x-val.data.loc.x)
                       +(holdNode.data.loc.y-val.data.loc.y)*(holdNode.data.loc.y-val.data.loc.y);
                   if (dist >THRESHOLD && HaveTempLink(holdNode.data.key,val.data.key)==true)
                   {
                       link = GetLinkFromKeys(holdNode.data.key,val.data.key);
                       if (link!=null)
                       {
                           //remove the link
                           myDiagram.startTransaction("remove link");
                           myDiagram.model.removeLinkData(link);
                           myDiagram.commitTransaction("remove link");
                           RuntimeService.tempLinkArray.pop(link);
                       }


                   }

               }


               //turn the color of all the link to black
               list = myDiagram.links;
               itr = list.iterator;
               while (itr.next()) {

                   val = itr.value;
                   shape = val.findObject("LINKSHAPE");
                   if (shape === null) return;
                   shape.stroke = "black";

               }


           });

   },


    addChangedListener : function (myDiagram,undoDisplay){
        myDiagram.model.addChangedListener(function(e) {

            if (e.change == go.ChangedEvent.Transaction
                && (e.propertyName === "CommittedTransaction" || e.propertyName === "FinishedUndo" || e.propertyName === "FinishedRedo")) {

                document.getElementById("mySavedModel").textContent = myDiagram.model.toJson();

            }


            // Add entries into the log
            var changes = e.toString();
            if (changes[0] !== "*") changes = "  " + changes;
            changedLog.innerHTML += changes + "<br/>"
            changedLog.scrollTop = changedLog.scrollHeight;

            // Modify the undoDisplay Diagram
            if (e.propertyName === "CommittedTransaction") {
                if (editToRedo != null) {
                    // remove from the undo display diagram all nodes after editToRedo
                    for (var i = editToRedo.data.index+1; i < editList.length; i++) {
                        undoDisplay.remove(editList[i]);
                    }
                    editList = editList.slice(0, editToRedo.data.index);
                    editToRedo = null;
                }

                var tx = e.object;
                var txname = (tx !== null ? e.object.name : "");
                var parentData = {text: txname, tag: e.object, index: editList.length - 1};
                undoModel.addNodeData(parentData)

                var parentKey = undoModel.getKeyForNodeData(parentData);

                var parentNode = undoDisplay.findNodeForKey(parentKey);

                if (tx !== null) {
                    var allChanges = tx.changes;
                    var itr = allChanges.iterator;
                    var odd = true;
                    while (itr.next()) {
                        var change = itr.value;
                        var childData = {
                            color: (odd ? "white" : "#E0FFED"),
                            text: change.toString()
                        }
                        odd = !odd;
                        undoModel.addNodeData(childData)
                        var childKey = undoModel.getKeyForNodeData(childData);
                        undoModel.addLinkData({ from: parentKey, to: childKey });
                    }
                    undoDisplay.commandHandler.collapseTree(parentNode);
                }
            } else if (e.propertyName === "FinishedUndo" || e.propertyName === "FinishedRedo") {
                var undoManager = model.undoManager;
                if (editToRedo !== null) {
                    editToRedo.isSelected = false;
                    editToRedo = null;
                }
                // Find the node that represents the undo or redo state and select it
                var nextEdit = undoManager.transactionToRedo;
                if (nextEdit !== null) {
                    var itr = undoDisplay.nodes;
                    while (itr.next()) {
                        var node = itr.value;
                        if (node.data.tag === nextEdit) {
                            node.isSelected = true;
                            editToRedo = node;
                            break;
                        }
                    }
                }
            }



        });
    },

    mouseDrop : function(RuntimeService,myDiagram)
    {
        myDiagram.mouseDrop= function (e){

            // consider to undo the bridge
            /* if (flagLinkEnter ==1 && TempLocLinkEnter!= null && GlobfromNode!=null && GlobtoNode!=null)
             {
             holdNode= myDiagram.selection.first();
             dist = SquaredDistance(TempLocLinkEnter,holdNode.data.loc);
             if (dist>BridgeTHRESHOLD)
             {
             //undo the bridge
             myDiagram.startTransaction("undo bridge");
             myDiagram.model.removeLinkData(LinkFromHold);
             tempExternalLinkArray.pop(LinkFromHold);
             myDiagram.model.removeLinkData(LinkHoldTo);
             tempExternalLinkArray.pop(LinkHoldTo);
             //add new links fromNode -> holdNode
             newlink = { from: GlobfromNode.data.key, to: GlobtoNode.data.key ,  color: "black"};
             myDiagram.model.addLinkData(newlink);
             myDiagram.commitTransaction("undo bridge");
             }
             //destroy temps and reset flag
             ResetTempForBridge();
             return;
             }  */
            if (RuntimeService.tempLinkArray!=null)
            {

                RuntimeService.tempLinkArray.splice(0,RuntimeService.tempLinkArray.length);

            }

            //remove all the templinks for each pair of nodes whose distance is above THRESHOLD
            list = myDiagram.nodes;
            itr = list.iterator;
            holdNode= myDiagram.selection.first();
            while (itr.next()) {
                val = itr.value;
                if (holdNode.data.loc!=null)
                {
                    dist = (holdNode.data.loc.x-val.data.loc.x)*(holdNode.data.loc.x-val.data.loc.x)
                        +(holdNode.data.loc.y-val.data.loc.y)*(holdNode.data.loc.y-val.data.loc.y);
                    if (dist >THRESHOLD && HaveTempLink(holdNode.data.key,val.data.key)==true)
                    {
                        link = GetLinkFromKeys(val.data.key,holdNode.data.key);
                        if (link!=null)
                        {
                            //remove the link
                            myDiagram.startTransaction("remove link");
                            myDiagram.model.removeLinkData(link);
                            myDiagram.commitTransaction("remove link");
                            RuntimeService.tempLinkArray.pop(link);
                        }


                    }
                }

            }
            //turn the color of all the link to black
            list = myDiagram.links;
            itr = list.iterator;

            while (itr.next()) {

                val = itr.value;
                shape = val.findObject("LINKSHAPE");
                if (shape === null) return;
                shape.stroke = "black";

            }

        }
    },
    DefineUndoDiagram : function($$){


        undoDisplay =
               $$(go.Diagram, "undoDisplayCanvas",
                   { allowMove: false,
                       maxSelectionCount: 1 });

           undoDisplay.nodeTemplate =
               $$(go.Node,
                   $$("TreeExpanderButton",
                       { width: 14,
                           "ButtonBorder.fill": "whitesmoke" }),
                   $$(go.Panel, go.Panel.Horizontal,
                       { position: new go.Point(16, 0) },
                       new go.Binding("background", "color"),
                       $$(go.TextBlock, {margin: 2},
                           new go.Binding("text", "text"))));

           undoDisplay.linkTemplate = $$(go.Link);  // not really used

           undoDisplay.layout =
               $$(go.TreeLayout,
                   { alignment: go.TreeLayout.AlignmentStart,
                       angle: 0,
                       compaction: go.TreeLayout.CompactionNone,
                       layerSpacing: 16,
                       layerSpacingParentOverlap: 1,
                       nodeIndent: 2,
                       nodeIndentPastParent: 0.88,
                       nodeSpacing: 0,
                       setsPortSpot: false,
                       setsChildPortSpot: false,
                       arrangementSpacing: new go.Size(2, 2)
                   });

           undoModel = new go.GraphLinksModel();  // initially empty
           undoModel.isReadOnly = true;
           undoDisplay.model = undoModel;

       },


    mouseDragOver : function(RuntimeService,myDiagram){ myDiagram.mouseDragOver=function(e){
        THRESHOLD = 12500;
        doc = e.documentPoint;
        //node is being dragged
        holdNode= myDiagram.selection.first();


        list = myDiagram.nodes;
        itr = list.iterator;
        count=0;
        if (holdNode!=null && holdNode.data.loc!=null)
        {

            //connect the hold node with the nodes in the area within the THRESHOLD by the templinks
            while (itr.next()) {
                val = itr.value;
                if (holdNode.data.loc!=null)
                {
                    dist = (holdNode.data.loc.x-val.data.loc.x)*(holdNode.data.loc.x-val.data.loc.x)
                        +(holdNode.data.loc.y-val.data.loc.y)*(holdNode.data.loc.y-val.data.loc.y);
                    if (dist <= THRESHOLD && val!=holdNode && IsConnected(holdNode,val)==false &&
                        !(holdNode instanceof go.Group)
                        && !(val instanceof go.Group) )
                    {
                        newlink = { from: val.data.key, to: holdNode.data.key , color: "lightgray"};
                        len= myDiagram.model.linkDataArray.length;
                        flag =0;

                        //make sure it doesn't link to itself
                        if (holdNode.data.key!=val.data.key )
                        {
                            /* if (holdNode.data.loc.x>=val.data.loc.x)
                             {
                             newlink.fromPort="L";
                             newlink.toPort="R";
                             }
                             else
                             {
                             newlink.fromPort="R";
                             newlink.toPort="L";
                             } */
                            myDiagram.startTransaction("Add Link");
                            myDiagram.model.addLinkData(newlink);
                            myDiagram.commitTransaction("Add Link");
                            //save to tempLink

                            RuntimeService.tempLinkArray.push(newlink);

                        }
                    }
                }
            }
        }



        //remove all the templinks for each pair of nodes whose distance is above THRESHOLD
        list = myDiagram.nodes;
        itr = list.iterator;
        holdNode= myDiagram.selection.first();
        while (itr.next()) {
            val = itr.value;
            if (holdNode.data.loc!=null)
            {
                dist = (holdNode.data.loc.x-val.data.loc.x)*(holdNode.data.loc.x-val.data.loc.x)
                    +(holdNode.data.loc.y-val.data.loc.y)*(holdNode.data.loc.y-val.data.loc.y);
                if (dist >THRESHOLD && HaveTempLink(holdNode.data.key,val.data.key)==true)
                {
                    link = GetLinkFromKeys(val.data.key,holdNode.data.key);
                    if (link!=null)
                    {
                        //remove the link
                        myDiagram.startTransaction("remove link");
                        myDiagram.model.removeLinkData(link);
                        myDiagram.commitTransaction("remove link");
                        RuntimeService.tempLinkArray.pop(link);
                    }


                }
            }
        }




        // consider to undo the bridge
        /* if (flagLinkEnter ==1 && TempLocLinkEnter!= null && GlobfromNode!=null && GlobtoNode!=null)
         {
         holdNode= myDiagram.selection.first();
         dist = SquaredDistance(TempLocLinkEnter,holdNode.data.loc);
         if (dist>BridgeTHRESHOLD)
         {


         //undo the bridge
         myDiagram.startTransaction("undo bridge");
         myDiagram.model.removeLinkData(LinkFromHold);
         tempExternalLinkArray.pop(LinkFromHold);
         myDiagram.model.removeLinkData(LinkHoldTo);
         tempExternalLinkArray.pop(LinkHoldTo);
         //add new links fromNode -> holdNode
         newlink = { from: GlobfromNode.data.key, to: GlobtoNode.data.key ,  color: "black"};
         myDiagram.model.addLinkData(newlink);
         myDiagram.commitTransaction("undo bridge");
         //destroy temps and reset flag
         ResetTempForBridge();
         }
         } */
        if (myDiagram.lastInput.up==true)
        {
            //turn the color of all the link to black
            list = myDiagram.links;
            itr = list.iterator;

            while (itr.next()) {

                val = itr.value;
                shape = val.findObject("LINKSHAPE");
                if (shape === null) return;
                shape.stroke = "black";

            }
        }



    }}



    }



})

