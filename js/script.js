let camera, scene, raycaster, renderer, controls, light, axesHelper;
let mouse = new THREE.Vector2(), MOUSE_ORIGIN = new THREE.Vector2(), MOUSE_DIRECTION = new THREE.Vector2(), MOUSE_RAY = new THREE.Vector2();
let INTERSECTED = new Array();
let rayOrigin, rayDirection;

init();
if ( Detector.webgl ) {
	animate();
} else {
	let warning = Detector.getWebGLErrorMessage();
	document.getElementById( 'container' ).appendChild( warning );
}

function init() {
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	scene.add( camera );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );

	light = new THREE.AmbientLight( 0xffffff );
	scene.add( light );

	axesHelper = new THREE.AxesHelper( 5 );
	scene.add( axesHelper );

	document.body.appendChild( renderer.domElement );

	controls = new THREE.OrbitControls( camera );
	camera.position.set( 5, 5, 5 );

	initCube();

	raycaster = new THREE.Raycaster();
	rayOrigin = new THREE.Vector3();
	rayDirection = new THREE.Vector3();
	controls.target.set( 0, 0, 0 );
	controls.enableZoom = false;
	controls.enablePan = false;
	controls.update();
	camera.updateProjectionMatrix();
	INTERSECTED = null;
	document.addEventListener( 'mousedown', onMouseDown, false );
	document.addEventListener( 'mouseup', onMouseUp, false );
	window.addEventListener( 'resize', onWindowResize, false );
}

function initCube( size = 3 ) {
	let block_edge_len = 1;
	let spacing = block_edge_len / 20;

	for ( let y = 0; y < size; y++ ) {
		for ( let x = 0; x < size; x++ ) {
			for ( let z = 0; z < size; z++ ) {

				let blockGeometry = new THREE.BoxGeometry(
					block_edge_len, block_edge_len, block_edge_len );

				for ( let i = 0; i < blockGeometry.faces.length; i++ ) {
					blockGeometry.faces[ i ].color.setHex( 0x383838 );
					if ( x === 0 && blockGeometry.faces[ i ].normal.x < 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0xffa500 );
					}
					if ( x === size - 1 && blockGeometry.faces[ i ].normal.x > 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0xff0000 );
					}
					if ( z === 0 && blockGeometry.faces[ i ].normal.z < 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0x0000ff );
					}
					if ( z === size - 1 && blockGeometry.faces[ i ].normal.z > 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0x008000 );
					}
					if ( y === 0 && blockGeometry.faces[ i ].normal.y < 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0xffff00 );
					}
					if ( y === size - 1 && blockGeometry.faces[ i ].normal.y > 0 ) {
						blockGeometry.faces[ i ].color.setHex( 0xffffff );
					}
				}

				const blockMaterial = new THREE.MeshBasicMaterial( {
					color: 0xffffff, vertexColors: THREE.FaceColors } );
				const block = new THREE.Mesh( blockGeometry, blockMaterial );
				const blockEdges = new THREE.EdgesGeometry( blockGeometry );
				const lineMaterial = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 5 } );
				const line = new THREE.LineSegments( blockEdges, lineMaterial );

				block.add( line );
				block.position.set( block_edge_len * x + ( spacing * x ),
					block_edge_len * y + ( spacing * y ),
					block_edge_len * z + ( spacing * z ) );
				block.geometry.computeBoundingBox();
				block.name = "block" + ( x + 1 ) * ( y + 1 ) * ( z + 1 );

				scene.add( block );
			}
		}
	}

	return 0;
}

function rotateAboutPoint( obj, point, axis, theta, pointIsWorld ){
	pointIsWorld = (pointIsWorld === undefined)? false : pointIsWorld;

	if(pointIsWorld){
		obj.parent.localToWorld(obj.position); // compensate for world coordinate
	}

	obj.position.sub(point); // remove the offset
	obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
	obj.position.add(point); // re-add the offset

	if(pointIsWorld){
		obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
	}

	obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

function rotateSide( axisNormal, sideCoord, direction, speed = 1 ) {
	let side = new THREE.Object3D();
	scene.add( side );

	if ( axisNormal.y != 0 ) {
		for ( let i = scene.children.length - 1; i >= 0; i-- ) {
			if ( Math.abs( scene.children[ i ].position.y - sideCoord.y ) < 0.0001 ) {
				THREE.SceneUtils.attach( scene.children[ i ], scene, side );
			}
		}

		let box = new THREE.Box3().setFromObject( side ); // compute bounding box of SIDE object
		let point = new THREE.Vector3(
			( box.max.x + box.min.x ) / 2,
			( box.max.y + box.min.y ) / 2,
			( box.max.z + box.min.z ) / 2
		); // center of the SIDE object

		let step = 1, angle = 90;
		/*
		while ( angle >= 0 ) {
			setTimeout( function() {

			}, 500 );

			//rotateAboutPoint( side, point, axisNormal, Math.PI / 180 * step * direction );

			//animate();
			side.updateMatrixWorld();
			angle -= step;
		}
		*/

		rotateAboutPoint( side, point, axisNormal, Math.PI / 2 * direction );
		side.updateMatrixWorld();

		for ( let i = side.children.length - 1; i >= 0; i-- ) {
			side.children[ i ].geometry.computeFaceNormals();
    		THREE.SceneUtils.detach( side.children[ i ], side, scene );
		}

	}

	return 0;
}

function onMouseDown( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	let intersects = raycaster.intersectObjects( scene.children );
	if ( intersects.length > 0 ) {
		controls.enableRotate = false;
		rayOrigin.copy( raycaster.ray.direction );
		INTERSECTED = intersects[ 0 ];
	} else {
		INTERSECTED = null;
	}
}

function onMouseUp( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

	controls.enableRotate = true;

	if ( INTERSECTED != null ) {
		raycaster.setFromCamera( mouse, camera );
		rayDirection.copy( raycaster.ray.direction );

		// rotating
		// find bigger abs value between x, y and z coords
		let rayRes = rayDirection.sub( rayOrigin );
		console.log( rayRes );

		// cicked on X+ side
		if ( INTERSECTED.face.normal.x != 0 ) {
			// turn around Y axis
			if ( Math.abs( rayRes.x ) > Math.abs( rayRes.y ) && Math.abs( rayRes.x ) > Math.abs( rayRes.z ) ) {
				rotateSide( new THREE.Vector3( 0, 1, 0 ), INTERSECTED.object.position, rayRes.x > 0 ? - 1 : 1 );
			} else
			// turn around Y axis
			if ( Math.abs( rayRes.z ) > Math.abs( rayRes.y ) && Math.abs( rayOrigin.z ) > Math.abs( rayRes.x ) ) {
				rotateSide( new THREE.Vector3( 0, 1, 0 ), INTERSECTED.object.position, rayRes.z > 0 ? - 1 : 1 );
			}
			// turn around Y axis
			else {
				rotateSide( new THREE.Vector3( 0, 0, 1 ), INTERSECTED.object.position, rayRes.y > 0 ? - 1 : 1 );
			}
		} else
		// cicked on Z+ side
		if ( INTERSECTED.face.normal.z != 0 ) {
			// turn around Y axis
			if ( Math.abs( rayRes.x ) > Math.abs( rayRes.y ) && Math.abs( rayRes.x ) > Math.abs( rayRes.z ) ) {
				rotateSide( new THREE.Vector3( 0, 1, 0 ), INTERSECTED.object.position, rayRes.x > 0 ? - 1 : 1 );
			} else
			// turn around Y axis
			if ( Math.abs( rayRes.z ) > Math.abs( rayRes.y ) && Math.abs( rayOrigin.z ) > Math.abs( rayRes.x ) ) {
				rotateSide( new THREE.Vector3( 0, 1, 0 ), INTERSECTED.object.position, rayRes.z > 0 ? - 1 : 1 );
			}
			// turn around Y axis
			else {
				rotateSide( new THREE.Vector3( 0, 0, 1 ), INTERSECTED.object.position, rayRes.y > 0 ? - 1 : 1 );
			}
		}

		INTERSECTED = null;
	}
}

function onWindowResize( event ) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	requestAnimationFrame( animate );
	render();
}

function render() {
	camera.updateMatrixWorld();
	controls.update();
	renderer.render( scene, camera );
}
