---
template: post
title: Rendering Basics with Metal iOS
date: 2017-02-27
---

[Model3D](http://model3d.co) -- 3D modeling software we're in the process of launching for iPad -- is built on the new GPU API [Metal](https://developer.apple.com/metal/). Metal lives up to its name (close to the metal) and is decidedly pretty awesome, especially when working with the more powerful iPad Pro. There isn't that much written about Metal so I'm going to cover some of the basics, as well as some 3D basics, here.

### Metal is a Thin Layer Over Apple Hardware

Metal is high performance because it's a thin layer over a small set of GPU hardware. While I won't go into the details, it eliminates most of the overhead of OpenGL as it doesn't have to worry about supporting a wide range of hardware on different platforms. In other words, it's trading performance for portability. If you're developing graphics software specifically for iOS (or macOS) then it's probably worth the trade off.

### Metal is Not Opinionated

One of the more challenging things about Metal, at least starting out, is that it's *not* opinionated. Apple's documentation and sample code will not show you one way to work with Metal, but many. This does add to the confusion of working with the technology, but since Metal is optimized for performance, this hands off approach is appropriate. In fact, Model3D uses Metal in different ways in the same project -- the 3D controls, for example, are rendered differently than the objects in the workspace.

### 3D Basics

![3D Basics](/static/img/3d-basics.jpg)

Just in case you're a new to 3D, this covers the basic terminology. Vertices are points in 3D space which are transformed to the 2D space of the screen during rendering. Vertices can be drawn individually as points (with an arbitrary pixel radius). Lines can be draw between vertices. In Metal, a line is always 1px in width. Solids are drawn as a set of triangles, being defined by a set of vertices *and* a set of indices. These are generally drawn in counter-clockwise order where ccw-drawn triangles are front-facing and cw-drawn triangles are rear facing. (This can be reversed.) Face is a fairly loose term as it can mean a single triangle or a set of triangles that form a polygon aligned to a plane.

### High Level Rendering

![Metal Diagram](/static/img/metal-high-level-diagram.jpg)

Very high level, what we're doing here is to allocate some memory for a texture (a rendering destination), doing some boilerplate pipeline setup, creating a bunch of draw commands and then executing the whole thing. If we're rendering to the screen, that last step will include a `+[MTLCommandBuffer presentDrawable:]` if we're rendering to a texture (to, say, create a UIImage) it will not.

All of the magic of rendering is going to happen in the "draw commands" part of that diagram.

![Draw Command Diagram](/static/img/draw-command-high-level.jpg)

The first part of the draw command is assigning memory to the pipeline. This can be "uniform" structs -- small amounts of memory that will get copied over to GPU memory and be available for shaders. If you're new to graphics programming they're called "uniforms" because they're the same for each call of the shader, where as, e.g., the vertex data will be different for each call to the shader. The uniform struct might carry a camera / projection matrix (usually a 4x4 matrix of floats) that we'll multiply our vertex positions by (more on that later).

Note we're saying *assign* memory and not allocate. Very small amounts of memory (say under 4kb) may be allocated and assigned each frame, but larger amounts of memory (e.g., vertex data) should be allocated once, or infrequently, and reused. Again, there are many ways to do this and no one correct way.

The "set pipeline state" here refers to `-[MTLRenderCommandEncoder setRenderPipelineState:]` and is where we'll assign our shaders. This pipeline state is specific to the draw commands that will follow and can be reset to another state any number of times before execution.

The actual draw commands will either be executed once per vertex in memory `-[MTLRenderCommandEncoder drawPrimitives:vertexStart:vertexCount:]` or will take an additional index buffer and be executed once per index `-[MTLRenderCommandEncoder drawIndexedPrimitives:indexCount: indexType:indexBuffer:indexBufferOffset:]`. The former is useful for drawing points whereas the latter is useful for drawing triangles for solid surfaces.

### Model3D Renderer

```objectivec
- (void)render:(CAMetalLayer *)layer {

    id<CAMetalDrawable> currentDrawable = [layer nextDrawable];
    id<MTLCommandBuffer> commandBuffer = [self.commandQueue commandBuffer];
    MTLRenderPassDescriptor* pass = [self renderPass:currentDrawable.texture];

    id<MTLRenderCommandEncoder> encoder;
    encoder = [commandBuffer renderCommandEncoderWithDescriptor:pass];
    [encoder setFrontFacingWinding:MTLWindingCounterClockwise];
    [encoder setCullMode:MTLCullModeBack];

    for (id<BLKRenderable> renderable in _renderables) {
        [renderable render:encoder device:_device];
    }

    [encoder endEncoding];

    [commandBuffer presentDrawable:currentDrawable];
    [commandBuffer commit];
}
```

The renderer in Model3D is no more complicated than that. The `commandQueue` is cached at startup. The `CAMetalDrawable` is passed in via the `CAMetalLayer`. The rendering is "driven" via a `CADisplayLink`. In this case the display link is set to fire 60 times per second.

The actual drawing duties are offloaded to our `BLKRenderable` protocol.

```objectivec
@protocol BLKRenderable <NSObject>

- (NSUInteger)renderOrder;
- (void)render:(id<MTLRenderCommandEncoder>)encoder device:(id<MTLDevice>)device;

@end
```

Using this protocol, instead of having the renderer handle everything centrally, allows us to draw things in a way that is most appropriate to the situation.

### Workspace Object Rendering

![APC Render](/static/img/apc-render-full.jpg)

The most efficient way to manage memory for workspace objects (the objects we're editing) is different than it would be if we were rendering geometry for a game and it's also different than how we're managing memory for other objects on our screen (e.g., control objects, 2D lines, etc.).

Workspace objects are very dynamic. The total number of vertices may change often and the position of those vertices will change constantly. Our triangle indices may change as well. Because of that we want to manage our memory in a way where it's relatively inexpensive to update our vertex data. Because of that we'll use the most "hands on" approach and manually allocate our memory.

Because this memory has to be shared between the CPU and GPU, we can't simply use `malloc`. We're going to have to use a combination of `getpagesize` and `posix_memalign`.

```objectivec
- (NSInteger)pageSize {
    return getpagesize();
}

- (NSInteger)vertexMemorySize {
    NSInteger bytes = 0;
    for (BLKObject* obj in _objects) {
        for (BLKFace* face in obj.faces) {
            bytes += sizeof(vertex_data) * face.vertices.count;
        }
    }
    NSInteger ps = [self pageSize];
    // Round up to next page size multiple
    return (int)ceil((double)bytes / (double)ps) * ps;
}

- (void)buildVertexMemory:(id<MTLDevice>)device {
    if (_vertexMemory != NULL) {
        free(_vertexMemory);
        _vertexMemory = NULL;
    }
    NSUInteger size = [self vertexMemorySize];
    posix_memalign(&_vertexMemory, [self pageSize], size);
    _vertexBuffer = [device
                     newBufferWithBytesNoCopy:_vertexMemory
                     length:size
                     options:MTLResourceCPUCacheModeWriteCombined
                     deallocator:nil];
}
```

This is short but there's actually quite a bit going on here. `getpagesize` is actually deprecated but is this the correct way to get the page size of the current hardware. What the page size is differs for different hardware. From Apple docs:

> In OS X and in earlier versions of iOS, the size of a page is 4 kilobytes. In later versions of iOS, A7- and A8-based systems expose 16-kilobyte pages to the 64-bit userspace backed by 4-kilobyte physical pages, while A9 systems expose 16-kilobyte pages backed by 16-kilobyte physical pages.

The short answer is don't hard code it and you won't have to worry about it. Our method `buildVertexMemory` is only called when the total number of vertices changes (e.g., and object is added to or deleted from our workspace). It is not called when the vertex data changes and certainly not called every frame.

The option `MTLResourceCPUCacheModeWriteCombined` is appropriate if we're going to manage the memory ourselves and that memory will be written to (but not read by) the CPU (i.e., our program logic). By calling `-[MTLDevice newBufferWithBytesNoCopy:length:options:deallocator:` we ensure that memory is not allocated (or managed by) Metal and it's going to use our chunk of page-aligned memory. The effect is that we can now write to the pointer `(vertex_data*)_vertexMemory` like any other C array and the GPU will see our updates without further intervention.

```objectivec
- (void)render:(id<MTLRenderCommandEncoder>)encoder device:(id<MTLDevice>)device {

    BLKRenderer* rend = [BLKRenderer sharedRenderer];

    // Update memory if necessary
    // Update data if necessary

    camera_uniform_data uni;
    simd::float4x4 cm = _mainCamera.matrix;
    uni.cm = self.proj_perspective * cm;

    [encoder setVertexBytes:&uni length:sizeof(camera_uniform_data) atIndex:1];
    [encoder setVertexBuffer:_vertexBuffer offset:0 atIndex:0];

    NSInteger vboffset = 0;
    NSInteger iboffset = 0;

    for (BLKObject* obj in _objects) {

        [encoder setVertexBufferOffset:vboffset atIndex:0];

        vboffset += sizeof(vertex_data) * obj.vertCount;

        // Solid pass

        [encoder setRenderPipelineState:rend.solidPipelineState];
        [encoder setDepthStencilState:rend.depthStencilA];

        [encoder drawIndexedPrimitives:MTLPrimitiveTypeTriangle
                            indexCount:obj.triCount * 3
                             indexType:MTLIndexTypeUInt32
                           indexBuffer:_indexBuffer
                     indexBufferOffset:iboffset];

        iboffset += sizeof(index_data) * obj.triCount * 3;

        // Edge pass

        [encoder setRenderPipelineState:rend.edgePipelineState];
        [encoder setDepthStencilState:rend.depthStencilA];

        [encoder drawIndexedPrimitives:MTLPrimitiveTypeLine
                            indexCount:obj.edgeCount * 2
                             indexType:MTLIndexTypeUInt32
                           indexBuffer:_indexBuffer
                     indexBufferOffset:iboffset];

        iboffset += sizeof(index_data) * obj.edgeCount * 2;

        // Point pass

        [encoder setRenderPipelineState:rend.pointPipelineState];
        [encoder setDepthStencilState:rend.depthStencilA];

        [encoder drawPrimitives:MTLPrimitiveTypePoint
                    vertexStart:0
                    vertexCount:obj.vertCount];
    }
}
```

You'll notice we're settings our pipeline state three times -- solid, edge and point. These represent both vertex and fragment shaders. If you're not familiar, a shader is the actual program executed, in parallel, by the GPU to render our data into a texture. Although it's not the only way to do it, in this case we're running a vertex shader followed by a fragment shader. A vertex shader is generally run once per vertex. In the case of our solid pass, each vertex may be used more than once as they're shared between independent triangles. For our point pass, each vertex will be used once.

Our fragment (pixel) shader is going to take the interpolated result of our vertex shaderand allow us to draw per-pixel to our destination.

In their simplest form, these will look something like:

```c
vertex io_vertex
vertex_solid(device vertex_data* vertices [[buffer(0)]],
             uint vid [[vertex_id]],
             constant camera_uniform_data& cuni [[buffer(1)]]) {
    io_vertex overt;
    vertex_data vert = vertices[vid];
    overt.position = cuni.cm * vert.pos;
    overt.color = vert.solid_color;
    return overt;
}

fragment float4
fragment_simple(io_vertex vert [[stage_in]]) {
    return vert.color;
}
```

You can see the fragment (pixel) shader is just passing along the color we've sent to it. Our vertex shader, in this case, is taking our uniform data, specifically our camera + projection matrix and multiplying our vertex position by it. This could have also been done in our `-render:device:` method, by the CPU, but that would mean not taking advantage of the parallel processing capabilities of the GPU.

You will also notice in the `-render:device:` method that we're keeping track of offsets manually. That's because our memory is laid out something along the lines of:

![Workspace Memory Layout](/static/img/workspace-mem-layout.jpg)

We have a single block of memory for vertices (typed `vertex_data*`) and a single block of memory for both triangle and edge indices (typed `unsinged int*`). Again, this isn't the only way we can do it, but in this case this is the best way to do it.

Other renderables (our control objects, 2D lines, etc.) are each managed somewhat differently, but I won't go into them in depth here.
