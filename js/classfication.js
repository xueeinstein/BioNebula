function classfication($scope) {
  $scope.class = [
  	{
  		id: 0,
  		name: 'promoter',
  		subclass: [
  			{
  				id: 0,
  			   name:'constitute',
  			   sub2Class:[
  			   		'strong promoter',
  					'medium promoter',
  					'weak promoter'
  			   ],
  			},
  			{
  				id: 1,
  				name: 'sensitive',
  				sub2Class:[
  					'inducer',
  					'repressor'
  				],
  			},
  			{
  				id: 2,
  				name: 'association with CDS experience',
  				sub2Class:[
  					'Resistance_gene',
  					'other_experience' 
  				],
  			},
  			{
  				id: 3,
  				name: 'source',
  				sub2Class:[
  					'bacterial_promoters',
  					'Phage_promoters'
  				],
  			},
  		],
  	},
  	{
  		id: 1,
  		name: 'RBS',
  	},
  	{
  		id: 2,
  		name: 'CDS',
  	},
  	{
  		id: 3,
  		name: 'terminators',
  	},
  	{
  		id: 4,
  		name: 'device',
  		subclass: [
  			{
  				id: 0,
  				name: 'inventer',
  				sub2Class:[
  					'TetR',
  					'LacI'
  				],
  			},
  			{
  				id: 1,
  				name: 'signaling',
  				sub2Class:[
  					'sender only',
  					'positive signal',
  					'negative signal'
  				],
  			},
  		],
  	},
  ];
}