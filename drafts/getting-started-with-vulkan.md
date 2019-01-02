---
template: post
title: Getting Started with Vulkan
date: 2019-01-01
---

#POST 1

Why Vulkan on Metal?

- Vulkan pros, Apple split 
- Metal & Vulkan are similar, a translation layer works (MoltenVK)
- Build renderer in Vulkan, cross platform works, no need to deal with Metal directly while benefitting from the better API
- 

Tutorial: [Vulkan](https://vulkan-tutorial.com)

About vulkan & vulkan vs apple -- better performance, more control, tiled rendering (mobile focused)

multi-threaded (for command submission), standardized byte code for shaders

Drawing a triangle:

step 1 - create instance, query for supported hardware, select a (or multipel) pyhysical devices. Can select a more capable card in this step

step 2 - create a logical device, specifying features. Pick what family of queues to use.

step 3 - create a (native) window (or equiv). We then need a surface and a swapchain. Swapchain is a collection of render targets. It's how we organize what we're drawing to and what we're presenting. (double - vsync or triple are common)

step 4 - to use an image from swapchain, we need to wrap it in an image view. imageview refernces part of an image, a framebuffer groups images for color, depth, stencil 

step 5 - render passes - describe what images will be used, how, and how they will be treated. eg color target, cleared to solid color 

step 6 - pipeline - sets up viewport, depth buffer, shaders, reference render pass. This pipeline has to be re-created - need to create pipelines in advance for any possible combo needed. Big performance boost here.

step 7 - command pools and command buffers. command buffers are allocated from a command pool. commands are sub'd to this. we need to record a command buffer for everyo possilbe image and select at draw time.

step 8 - main loop. aquire image from swap chain, select correct command buffer, execute it. return image for presentation. Commands are execurted async. we have to syncrhonize e.g, semaphores. we need to wait for draw commands *and* for presentation to finish.

validation layers -- optional validation to prevent crashes. 

#POST 2

https://github.com/KhronosGroup/MoltenVK
Setting up Vulkan + MoltenVK on Mac OSX

Easier to use the MoltenVK example vs the LunarG SDK.

What is MoltenVK & it's brief history

Show an example with CALayer instead of GLFW

- Fetch example project / create new project
- Add / pull MoltenVK submodule
- Run MoltenVK/fetchDependencies (you may need to run brew install cmake python first)
- Add MoltenVKPackaging / Build MoltenVKPackage (MacOS Only)
- Use the static lib. Include headers. The framework isn't valid (missing a valid info.plist)
- Build the static lib target, add to frameworks and libraries.
- Add header path `$(PROJECT_DIR)/MoltenVK/MoltenVK/include`
- add to preprocessor macros: VK_USE_PLATFORM_MACOS_MVK
- pop `#include <vulkan/vulkan.h>` into your AppDelegate to make sure everything builds ok


- create a VulkanViewController and a VulkanView

```objectivecpp
#import "VulkanView.h"
#import <QuartzCore/CAMetalLayer.h>

@implementation VulkanView

- (BOOL)wantsUpdateLayer {
  return YES;
}

+ (Class)layerClass {
  return [CAMetalLayer class];
}

- (CALayer *)makeBackingLayer {
  CALayer* layer = [self.class.layerClass layer];
  CGSize viewScale = [self convertSizeToBacking: CGSizeMake(1.0, 1.0)];
  layer.contentsScale = MIN(viewScale.width, viewScale.height);
  return layer;
}

- (BOOL)acceptsFirstResponder {
  return YES;
}

@end
```

```objectivecpp
#import "VulkanViewController.h"
#import <QuartzCore/CAMetalLayer.h>

static CVReturn DisplayLinkCallback(CVDisplayLinkRef displayLink,
                                    const CVTimeStamp* now,
                                    const CVTimeStamp* outputTime,
                                    CVOptionFlags flagsIn,
                                    CVOptionFlags* flagsOut,
                                    void* target) {
  // Call render
  return kCVReturnSuccess;
}

@implementation VulkanViewController {
  CVDisplayLinkRef _displayLink;
}

- (void)viewDidLoad {
  [super viewDidLoad];
  
  self.view.wantsLayer = YES;    
  
  // TODO: Init Vulkan
  
  CVDisplayLinkCreateWithActiveCGDisplays(&_displayLink);
  CVDisplayLinkSetOutputCallback(_displayLink, &DisplayLinkCallback, nil);
  CVDisplayLinkStart(_displayLink);
}

- (void)dealloc {
  CVDisplayLinkRelease(_displayLink);
}

@end
```

We need to pull in validation layers from lunarg 



#POST 3

Example project: We need to build a Mac specific example vis https://vulkan-tutorial.com/Drawing_a_triangle/Setup/Base_code

explicity create and destroy all vulkan objects

(for larger progs, use RAII and e.g., overloading std::shared_ptr)

create app info

```cpp
VkApplicationInfo appInfo = {};
appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
appInfo.pApplicationName = "Hello Triangle";
appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
appInfo.pEngineName = "No Engine";
appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
appInfo.apiVersion = VK_API_VERSION_1_0;
```

(need to specify `sType` in many cases)

instance info:

```cpp
VkInstanceCreateInfo createInfo = {};
createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
createInfo.pApplicationInfo = &appInfo;
// need to also sepecify extentions
//createInfo.enabledExtensionCount = _;
//createInfo.ppEnabledExtensionNames = _;
createInfo.enabledLayerCount = 0; // TODO:
``` 

create

```cpp
VkResult result = vkCreateInstance(&createInfo, nullptr, &instance);
if (vkCreateInstance(&createInfo, nullptr, &instance) != VK_SUCCESS) {
    throw std::runtime_error("failed to create instance!");
}
```

check extensions

```cpp
uint32_t extensionCount = 0;
vkEnumerateInstanceExtensionProperties(nullptr, &extensionCount, nullptr);
std::vector<VkExtensionProperties> extensions(extensionCount);
vkEnumerateInstanceExtensionProperties(nullptr, &extensionCount, extensions.data());
std::cout << "available extensions:" << std::endl;
for (const auto& extension : extensions) {
    std::cout << "\t" << extension.extensionName << std::endl;
}
```

cleanup on shutdown

```cpp
void cleanup() {
    vkDestroyInstance(instance, nullptr);
    //glfwDestroyWindow(window);
    //glfwTerminate();
}
```

validation layers:

https://github.com/KhronosGroup/Vulkan-ValidationLayers

https://vulkan-tutorial.com/Drawing_a_triangle/Setup/Validation_layers

Set this up.

..............

set up physical device:

```cpp
void pickPhysicalDevice() {
	VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
	uint32_t deviceCount = 0;
	vkEnumeratePhysicalDevices(instance, &deviceCount, nullptr);
	if (deviceCount == 0) {
    	throw std::runtime_error("failed to find GPUs with Vulkan support!");
    }
    std::vector<VkPhysicalDevice> devices(deviceCount);
vkEnumeratePhysicalDevices(instance, &deviceCount, devices.data());
	bool isDeviceSuitable(VkPhysicalDevice device) {
    	return true;
	}
	for (const auto& device : devices) {
    if (isDeviceSuitable(device)) {
        physicalDevice = device;
        break;
    }
	}

	if (physicalDevice == VK_NULL_HANDLE) {
    	throw std::runtime_error("failed to find a suitable GPU!");
	}
}

// THis is fine for now
bool isDeviceSuitable(VkPhysicalDevice device) {
    return true;
}

bool isDeviceSuitable(VkPhysicalDevice device) {
    VkPhysicalDeviceProperties deviceProperties;
    VkPhysicalDeviceFeatures deviceFeatures;
    vkGetPhysicalDeviceProperties(device, &deviceProperties);
    vkGetPhysicalDeviceFeatures(device, &deviceFeatures);

    return deviceProperties.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU &&
           deviceFeatures.geometryShader;
}
```

or we can rate devices by suitability

now we need to do queue families:

Different types of commands need different queue families, e.g., compute-only queues.

```cpp
#include <optional>

struct QueueFamilyIndices {
    std::optional<uint32_t> graphicsFamily;

    bool isComplete() {
        return graphicsFamily.has_value();
    }
};

QueueFamilyIndices findQueueFamilies(VkPhysicalDevice device) {
    QueueFamilyIndices indices;

    uint32_t queueFamilyCount = 0;
	vkGetPhysicalDeviceQueueFamilyProperties(device, 	&queueFamilyCount, nullptr);

	std::vector<VkQueueFamilyProperties> 	queueFamilies(queueFamilyCount);
	vkGetPhysicalDeviceQueueFamilyProperties(device, 	&queueFamilyCount, queueFamilies.data());

	int i = 0;
	for (const auto& queueFamily : queueFamilies) {
    	if (queueFamily.queueCount > 0 && queueFamily.queueFlags & VK_QUEUE_GRAPHICS_BIT) {
        	indices.graphicsFamily = i;
    	}

    	if (indices.isComplete()) {
        	break;
   		}

		i++;
	}

   return indices;
}

bool isDeviceSuitable(VkPhysicalDevice device) {
    QueueFamilyIndices indices = findQueueFamilies(device);

    return indices.isComplete();
}
```



