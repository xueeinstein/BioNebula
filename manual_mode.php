<!DOCTYPE html>
<head>
<meta charset="UTF-8">
<title>nebula -manual mode design</title>

<link rel="shortcut icon" type="image/x-icon" href="favicon.ico" >
<link rel="stylesheet" type="text/css" href="css/manual_mode_style.css">
<link rel="stylesheet" type="text/css" href="css/angular-ui.css">
<link rel="stylesheet" type="text/css" href="css/bootstrap.min.css">

<script src="js/Vendors/angular.js"></script>
<script src="js/Vendors/ui-bootstrap-tpls-0.6.0.js"></script>
<script type="text/javascript" src="js/Vendors/go-debug.js"></script>

<script type="text/javascript" src="app.js"></script>
<script type="text/javascript" src="js/services/DiagramService.js"></script>
<script type="text/javascript" src="js/services/RunTimeService.js"></script>
<script type="text/javascript" src="js/controllers/ButtonController.js"></script>
<script type="text/javascript" src="js/controllers/DiagramController.js"></script>
<script type="text/javascript" src="js/directives/Directives.js"></script>

<script type="text/javascrip" src="js/libs/Blob.js"></script>
<script type="text/javascrip" src="js/libs/canvas-toBlob.js"></script>
<script type="text/javascript" src="js/libs/FileSaver.js"></script>
<script type="text/javascript" src="js/file.js"></script>

</head>
<html ng-app="app">
<div id="control_panel">
	<div id="logo">
		<img src="img/logo.png" />
		<img src="img/team_logo.png" />
	</div>
	<!--button -->
<div id="button">
<ZoomOut></ZoomOut>
<ZoomIn></ZoomIn>
<SelectAll></SelectAll>
<Cut></Cut>
<Copy></Copy>
<Paste></Paste>
<Delete></Delete>
<Group></Group>
<UnGroup></UnGroup>
<Undo></Undo>
<Redo></Redo>
<ZoomtoFit></ZoomtoFit>
<!--save board-->
<saveboard></saveboard>
</div>
<!--end of button-->
</div><!-- end of control panel -->

<br>
<!--diagram controller-->
<div ng-controller="DiagramCtrl" style="width:100%">
  <span id="paletteSpan">
  <div id="leftBar">
  <div id="search_class">
      <br>
      <!--zippy-->
      <zippy > <div type="button" class="btn btn-primary" ng-click="toggleContent();  refreshPalette()">Search classification</div>
          <div  ng-show="isContentVisible">
              <!--search box-->
              <search></search>

              <span>{{searchText}}</span>

              <ul class="unstyled">
                  <li ng-repeat="item in list | filter: searchText"> <span class="">{{item.text | uppercase}} - {{item.des | lowercase}}</span>

                  </li>
              </ul>
          </div>
      </zippy>
      <!--end of zippy-->
  </div><!-- end of #search_class -->

    <!--Diagrams navigator-->
    <div id="navigator" style="border: solid 1px gray; "></div>

  </div><!-- end of #leftBar -->
    <!--Palette-->
    <div id="myPalette" style="border: solid 1px gray; "></div>

    </span>
    <span id="diagramSpan">
    <!--Editor-->
    <!--<div autofocus placeholder="Editor \ s area...." id="infobar"   style="border: solid 1px gray;overflow:scroll " wrap="SOFT" >-->
    <!--<tabhistory></tabhistory>-->
    <!--<ng-view></ng-view>-->
    <div id="leftspan" >


        <div id="history"></div> <div id="modelChangedLog" style="height:30%;border: solid 1px gray; font-family:Monospace; font-size:11px; overflow:scroll"></div>
        <div id="undoDisplayCanvas" style="height:30%; border: solid 1px gray"></div>
        <textarea autofocus placeholder="Editor \ s area...." id="editor"   style=" height:30%;width:100%;border: solid 1px gray ;overflow:scroll " wrap="SOFT" ></textarea>



    </div>

    <!--Diagram-->
    <div id="myDiagram" style="border: solid 1px gray; "></div>


   </span><!-- end of #diagramSapn -->

</div><!-- end of DiagramCtrl -->
<br/>


</html>

