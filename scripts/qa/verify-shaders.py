#!/usr/bin/env python3
"""Optional offscreen GLSL compilation check: pip install moderngl==5.12.0.
Uses Mesa EGL when available; it does not replace browser WebGL visual QA.
"""
from pathlib import Path
import re
import moderngl
root = Path(__file__).resolve().parents[2]
source = (root / 'dist/photo-buildings.mjs').read_text()
vertex = re.search(r'const vertexSource=`(.*?)`;', source, re.S).group(1)
fragment = re.search(r'const fragmentSource=`(.*?)`;', source, re.S).group(1)
context = moderngl.create_standalone_context(backend='egl', require=330)
program = context.program(vertex_shader=vertex, fragment_shader=fragment)
assert {'a_pos', 'a_normal', 'a_material', 'u_matrix', 'u_span', 'u_photo', 'u_night'} <= set(program)
print(context.info['GL_RENDERER'])
print('GLSL ES 300 building shaders compiled and linked successfully.')
