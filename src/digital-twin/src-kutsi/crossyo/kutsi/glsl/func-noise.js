
// -----------------------------------------------------------------------------

export const hash__ = {
    src: `
vec2 hash( vec2 p ) // replace this by something better
{
    p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
`,
//     src: `
// vec2 hash( vec2 p ) // from voronoi, 偏大
// {
//     //p = mod(p, 4.0); // tile
//     p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
//     return fract(sin(p)*18.5453);
// }
//     `,
    deps: null
}

// -----------------------------------------------------------------------------

export const noise_simplex = {
    src: `

float noise_simplex( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

    vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

float noise_simplex_fractal(in vec2 uv)
{
    // simplex noise + fractal
    mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
    float f  = 0.5000*noise_simplex( uv ); uv = m*uv;
    f += 0.2500*noise_simplex( uv ); uv = m*uv;
    f += 0.1250*noise_simplex( uv ); uv = m*uv;
    f += 0.0625*noise_simplex( uv ); uv = m*uv;
    return f;
}
`,
    deps: { hash__ }
}

// -----------------------------------------------------------------------------

/*
    https://www.shadertoy.com/view/MslGD8
  
    用法：
  
    vec2 c = voronoi( (14.0+6.0*sin(0.2*iTime))*p );

    vec3 col = 0.5 + 0.5*cos( c.y*6.2831 + vec3(0.0,1.0,2.0) ); // 改为伪色彩显示
    col *= clamp(1.0 - 0.4*c.x*c.x,0.0,1.0); // 增加渐变 类似 ao
    col -= (1.0-smoothstep( 0.08, 0.09, c.x)); // 增加一个黑点 dot

    fragColor = vec4( col, 1.0 );
 */
export const noise_voronoi = {
    src: `

vec2 noise_voronoi( in vec2 x )
{
    vec2 n = floor( x );
    vec2 f = fract( x );

	vec3 m = vec3( 8.0 );
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ )
    {
        vec2  g = vec2( float(i), float(j) );
        vec2  o = hash( n + g );
	    // vec2  r = g - f + (0.5+0.5*sin(iTime+6.2831*o));
        vec2  r = g - f + o;
		float d = dot( r, r );
        if( d<m.x )
            m = vec3( d, o );
    }

    return vec2( sqrt(m.x), m.y+m.z );
}
`,
    deps: { hash__ }
}

// -----------------------------------------------------------------------------
